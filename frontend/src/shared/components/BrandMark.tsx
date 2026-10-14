/**
 * The project mark: an open-pit mine seen from above, its benches drawn as gold rings, with a radar
 * sweep and two blips for the machines being tracked, on ink. Drawn on a 48-unit grid; the favicon
 * (public/favicon.svg) is a simplified version for 16 px. Decorative: the link around it carries the name.
 */
function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect className="brand-mark__ground" width="48" height="48" rx="11" />
      <g className="brand-mark__lines">
        <circle cx="24" cy="24" r="15" />
        <circle cx="24" cy="24" r="9.5" />
        <circle cx="24" cy="24" r="4" />
        <path d="M24 24L35.5 9.5" />
        <circle className="brand-mark__blip" cx="17.3" cy="17.3" r="2.4" />
        <circle className="brand-mark__blip" cx="30.7" cy="30.7" r="2.4" />
      </g>
    </svg>
  )
}

export default BrandMark
