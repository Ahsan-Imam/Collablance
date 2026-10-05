import './legal.css'

export default function LegalLayout({ children }) {
  return (
    <div className="legal-page">
      <div className="container container--narrow">
        {children}
      </div>
    </div>
  )
}
