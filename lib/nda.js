// The standard CollabLance project NDA. Plain template, no AI: everyone signs
// the same wording, and the filled-in text is stored with the NDA so what was
// signed can never change.
// TEMPLATE ONLY — have a lawyer review this before relying on it.
export const NDA_VERSION = '1.0'

export function buildNdaText({ projectTitle, clientName, teamName, date }) {
  return `NON-DISCLOSURE AGREEMENT (version ${NDA_VERSION})

Date: ${date}
Project: ${projectTitle}
Client ("Disclosing Party"): ${clientName}
Team ("Receiving Party"): ${teamName}, meaning every team member who signs below

1. Confidential Information
"Confidential Information" means all non-public information the Client shares with the Team for this Project, in any form, including business plans, customer data, designs, source code, credentials, pricing and the project files and messages exchanged on CollabLance.

2. What the Team agrees to
Each team member agrees to:
(a) use Confidential Information only to carry out this Project;
(b) not share it with anyone outside the Team without the Client's written consent;
(c) keep it reasonably secure; and
(d) tell the Client promptly on learning of any unauthorised use or disclosure.

3. What is not confidential
This Agreement does not cover information that (a) is or becomes public other than through a breach of this Agreement; (b) the team member already lawfully knew; (c) the team member lawfully received from someone else without a duty of confidence; or (d) must be disclosed by law or court order, after giving the Client notice where the law allows.

4. Portfolio
Team members will not show work from this Project in a portfolio, or name the Client publicly, without the Client's written consent.

5. Return of materials
When the Project ends, or when the Client asks, each team member will delete or return the Confidential Information they hold, except copies the law requires them to keep.

6. Term
These duties begin when a team member signs and continue for two (2) years after the Project ends.

7. Ownership
Nothing in this Agreement transfers ownership of any Confidential Information. Ownership of the work produced is governed by the CollabLance Intellectual Property Policy.

8. Governing law
This Agreement is governed by the laws of India. The courts at Pune, Maharashtra have exclusive jurisdiction.

9. Parties
This Agreement is between the Client and each team member who signs it. CollabLance provides the signing record but is not a party to it.

Signed electronically on CollabLance. Each signature is recorded with the signer's account, name and the time of signing.`
}
