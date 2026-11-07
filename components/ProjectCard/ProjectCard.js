import Link from 'next/link'

// Styles live in app/projects/projects.css — import it on any page that renders this.

export const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }
export const STATUS_COLORS = { open: '#059669', in_progress: '#d97706', completed: '#6366f1', cancelled: '#dc2626' }

export default function ProjectCard({ project }) {
  const budgetStr = project.budget_min && project.budget_max
    ? `₹${Number(project.budget_min).toLocaleString()} – ₹${Number(project.budget_max).toLocaleString()}`
    : project.budget_min
      ? `From ₹${Number(project.budget_min).toLocaleString()}`
      : 'Budget TBD'

  return (
    <Link href={`/projects/${project.id}`} className="project-card animate-fade-in-up" id={`project-${project.id}`}>
      <div className="project-card__header">
        <h3 className="project-card__title">{project.title}</h3>
        <span className="project-card__status" style={{ color: STATUS_COLORS[project.status] }}>
          ● {STATUS_LABELS[project.status] || project.status}
        </span>
      </div>
      <p className="project-card__desc">{project.description}</p>
      <div className="project-card__meta">
        <span className="project-card__budget">💰 {budgetStr}</span>
        {project.deadline && (
          <span className="project-card__deadline">📅 {new Date(project.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        )}
        {project.collectives?.name && (
          <span className="badge badge--neutral">👥 {project.collectives.name}</span>
        )}
      </div>
      {project.skills_needed?.length > 0 && (
        <div className="project-card__skills">
          {project.skills_needed.slice(0, 4).map(s => (
            <span key={s} className="badge badge--neutral" style={{ fontSize: '0.7rem' }}>{s}</span>
          ))}
          {project.skills_needed.length > 4 && (
            <span className="badge badge--neutral" style={{ fontSize: '0.7rem' }}>+{project.skills_needed.length - 4}</span>
          )}
        </div>
      )}
    </Link>
  )
}
