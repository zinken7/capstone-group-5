import StateMessage from '../../../shared/components/StateMessage'
import { useLiveSites } from '../../../hooks/useLiveSites'
import type { AnalyticsBreakdown, AnalyticsSummary } from '../types'
import { buildAnalyticsSummary } from '../presentation'
import '../analytics.css'

interface AnalyticsPageProps {
  /** Test/demo override; normal application runtime always uses the live API. */
  summary?: AnalyticsSummary
}

function Breakdown({ title, items, total }: { title: string; items: AnalyticsBreakdown[]; total: number }) {
  return (
    <section className="chart-card">
      <h2>{title}</h2>
      <div className="bar-chart">
        {items.map((item) => (
          <div className="bar-row" key={item.label}>
            <span>{item.label}</span>
            <div className="bar-track"><span style={{ width: `${total ? (item.value / total) * 100 : 0}%` }} /></div>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function AnalyticsPage({ summary: suppliedSummary }: AnalyticsPageProps = {}) {
  const { sites, loading: liveLoading, error: liveError } = useLiveSites()
  const summary: AnalyticsSummary = suppliedSummary ?? buildAnalyticsSummary(sites)
  const loading = suppliedSummary === undefined && liveLoading
  const error = suppliedSummary === undefined ? liveError : null

  return (
    <section className="product-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Market overview</p>
          <h1>Analytics</h1>
          <p className="intro">Headline measures cover verified automated equipment loaded from the project API.</p>
        </div>
      </header>

      {loading && <StateMessage variant="loading" title="Loading live analytics" message="Connecting to the backend API…" />}
      {error && <StateMessage variant="error" title="Unable to load analytics" message={`${error}. Check that the backend is running and try again.`} />}
      {!loading && !error && summary.siteCount === 0 ? (
        <StateMessage title="No analytics available" message="Analytics will appear when equipment records are available." />
      ) : !loading && !error ? (
        <>
          <div className="metric-grid">
            <article className="metric-card"><span>Automated machines</span><strong>{summary.machineCount}</strong><small>Recorded quantity</small></article>
            <article className="metric-card"><span>Mine sites</span><strong>{summary.siteCount}</strong><small>Distinct locations</small></article>
            <article className="metric-card"><span>Countries</span><strong>{summary.countryCount}</strong><small>Geographic coverage</small></article>
          </div>
          <div className="chart-grid">
            <Breakdown title="Machines by type" items={summary.machinesByType} total={summary.machineCount} />
            <Breakdown title="Machines by country" items={summary.machinesByCountry} total={summary.machineCount} />
            <Breakdown title="Machines by automation level" items={summary.machinesByAutomationLevel} total={summary.machineCount} />
            <Breakdown title="Machines by technology supplier" items={summary.machinesBySupplier} total={summary.machineCount} />
          </div>
        </>
      ) : null}
    </section>
  )
}

export default AnalyticsPage
