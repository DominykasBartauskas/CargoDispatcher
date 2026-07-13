import type { Analysis } from '../lib/analysis'
import type { Section, Update } from '../lib/types'

const SECTIONS: [Section, string][] = [
  ['trains', 'Trains & routes'],
  ['stations', 'Train Stations'],
  ['trucks', 'Trucks & routes'],
  ['truckStations', 'Truck Stations'],
  ['analysis', 'Analysis'],
]

export function SectionNav({
  section,
  analysis,
  update,
}: {
  section: Section
  analysis: Analysis
  update: Update
}) {
  const badgeClass = analysis.errors.length ? 'err' : analysis.warnings.length ? 'warn' : 'ok'
  const badgeText = analysis.errors.length
    ? analysis.errors.length
    : analysis.warnings.length
      ? analysis.warnings.length
      : '✓'

  return (
    <nav className="sectionnav">
      {SECTIONS.map(([key, label]) => (
        <button
          key={key}
          className={`snav ${section === key ? 'active' : ''}`}
          onClick={() => update((s) => void (s.section = key))}
        >
          {label}
          {key === 'analysis' && <span className={`badge ${badgeClass}`}>{badgeText}</span>}
        </button>
      ))}
    </nav>
  )
}
