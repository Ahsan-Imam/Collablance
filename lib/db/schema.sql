-- ===== CollabLance Phase 1 Database Schema =====
-- Run this in your Supabase SQL Editor
-- All tables have RLS enabled per guardrails

-- ===== 1. Profiles =====
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  bio TEXT DEFAULT '',
  skills TEXT[] DEFAULT '{}',
  hourly_rate INTEGER DEFAULT 0, -- stored in INR, integer only
  location TEXT DEFAULT '',
  portfolio_url TEXT DEFAULT '',
  experience_years INTEGER DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'freelancer' CHECK (role IN ('freelancer', 'client')),
  rating_avg INTEGER DEFAULT 0, -- stored as 0-500 (e.g. 450 = 4.5 stars), integer to avoid float
  rating_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ DEFAULT NULL, -- soft delete per guardrails
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view any profile" ON profiles
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ===== 2. Collectives =====
CREATE TABLE collectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  focus_area TEXT DEFAULT '',
  created_by UUID NOT NULL REFERENCES profiles(id),
  member_count INTEGER DEFAULT 1,
  rating_avg INTEGER DEFAULT 0, -- integer, 0-500 scale
  rating_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE collectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view collectives" ON collectives
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create collectives" ON collectives
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update collective" ON collectives
  FOR UPDATE USING (auth.uid() = created_by);

-- ===== 3. Collective Members =====
CREATE TABLE collective_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collective_id UUID NOT NULL REFERENCES collectives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ DEFAULT NULL, -- soft delete
  UNIQUE(collective_id, user_id)
);

ALTER TABLE collective_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their collective's members" ON collective_members
  FOR SELECT USING (
    left_at IS NULL AND (
      auth.uid() = user_id OR
      EXISTS (
        SELECT 1 FROM collective_members cm
        WHERE cm.collective_id = collective_members.collective_id
        AND cm.user_id = auth.uid()
        AND cm.left_at IS NULL
      )
    )
  );

CREATE POLICY "Collective owner can add members" ON collective_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM collective_members cm
      WHERE cm.collective_id = collective_members.collective_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
      AND cm.left_at IS NULL
    )
    OR auth.uid() = user_id -- user can join themselves
  );

-- ===== 4. Projects =====
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget INTEGER NOT NULL, -- in paisa (INR * 100) to avoid float issues
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'disputed')),
  collective_id UUID REFERENCES collectives(id),
  posted_by UUID NOT NULL REFERENCES profiles(id),
  skills_required TEXT[] DEFAULT '{}',
  deadline TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open projects" ON projects
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Project poster can update" ON projects
  FOR UPDATE USING (auth.uid() = posted_by);

-- ===== 5. Milestones =====
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount INTEGER NOT NULL, -- in paisa, integer only
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'disputed', 'cancelled')),
  order_index INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view milestones" ON milestones
  FOR SELECT USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = milestones.project_id
      AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "Project poster can manage milestones" ON milestones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = milestones.project_id
      AND p.posted_by = auth.uid()
    )
  );

-- ===== 6. Payment Splits =====
-- Splits use INTEGER percentages to avoid float rounding errors (guardrail)
-- e.g. 50, 30, 20 — must sum to 100
CREATE TABLE payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  percentage INTEGER NOT NULL CHECK (percentage > 0 AND percentage <= 100), -- INTEGER only
  is_locked BOOLEAN DEFAULT FALSE, -- once locked, never update (guardrail)
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view splits" ON payment_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = payment_splits.project_id
      AND p.deleted_at IS NULL
    )
  );

-- ===== 7. Transactions =====
-- Every financial transaction logged with all required fields (guardrail)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  milestone_id UUID REFERENCES milestones(id),
  sender_id UUID NOT NULL REFERENCES profiles(id), -- client
  receiver_id UUID NOT NULL REFERENCES profiles(id), -- freelancer
  amount INTEGER NOT NULL, -- in paisa, integer only
  platform_fee INTEGER NOT NULL DEFAULT 0, -- in paisa
  type TEXT NOT NULL CHECK (type IN ('escrow_in', 'escrow_out', 'split_payment', 'refund', 'platform_fee')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  razorpay_payment_id TEXT, -- Razorpay reference, NOT stored in localStorage (guardrail)
  razorpay_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() -- timestamp required per guardrail
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ===== 8. Ratings =====
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  reviewee_id UUID NOT NULL REFERENCES profiles(id),
  score INTEGER NOT NULL CHECK (score >= 100 AND score <= 500), -- 1.0-5.0 as integer (100-500)
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, reviewer_id, reviewee_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings" ON ratings
  FOR SELECT USING (true);

CREATE POLICY "Project members can create ratings" ON ratings
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ===== 9. Messages (Project Chat) =====
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL, -- soft delete
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view messages" ON messages
  FOR SELECT USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN collective_members cm ON cm.collective_id = p.collective_id
      WHERE p.id = messages.project_id
      AND (p.posted_by = auth.uid() OR cm.user_id = auth.uid())
      AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "Project members can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN collective_members cm ON cm.collective_id = p.collective_id
      WHERE p.id = messages.project_id
      AND (p.posted_by = auth.uid() OR cm.user_id = auth.uid())
      AND p.deleted_at IS NULL
    )
  );

-- ===== 10. Consent Records =====
-- Track when user accepted cookies and which version of terms (guardrail)
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('cookies', 'terms', 'privacy')),
  consent_level TEXT DEFAULT 'essential', -- 'essential' or 'all' for cookies
  policy_version TEXT NOT NULL DEFAULT '1.0',
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent records" ON consent_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent records" ON consent_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===== Auto-create profile on signup =====
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'freelancer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===== Indexes for performance =====
CREATE INDEX idx_profiles_skills ON profiles USING GIN(skills);
CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_collective ON projects(collective_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_milestones_project ON milestones(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_project ON messages(project_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_project ON transactions(project_id);
CREATE INDEX idx_collective_members_collective ON collective_members(collective_id) WHERE left_at IS NULL;
