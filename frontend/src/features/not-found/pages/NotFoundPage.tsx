import { Link, useLocation } from 'react-router-dom'

function NotFoundPage() {
  const location = useLocation()

  return (
    <section className="product-page not-found-page" aria-labelledby="not-found-heading">
      <p className="eyebrow">404 · Page not found</p>
      <h1 id="not-found-heading">We could not find that page</h1>
      <p className="intro">The address <code>{location.pathname}</code> does not match a page in Mining Market Map.</p>
      <nav aria-label="Suggested pages" className="not-found-links">
        <Link className="button button--primary" to="/map">Open map</Link>
        <Link className="button button--secondary" to="/equipment">Equipment register</Link>
        <Link className="button button--secondary" to="/analytics">Analytics</Link>
      </nav>
    </section>
  )
}

export default NotFoundPage
