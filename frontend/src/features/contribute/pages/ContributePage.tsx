function ContributePage() {
  return (
    <section className="product-page contribute-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Community data</p>
          <h1>Contribute</h1>
          <p className="intro">Help improve the autonomous mining equipment dataset.</p>
        </div>
      </header>
      <section className="coming-soon" aria-labelledby="contribute-status">
        <span aria-hidden="true">S3</span>
        <div>
          <h2 id="contribute-status">Submission workflow planned for Sprint 3</h2>
          <p>This page is included in the product navigation now. Record submission and administrator verification are not yet available.</p>
        </div>
      </section>
    </section>
  )
}

export default ContributePage
