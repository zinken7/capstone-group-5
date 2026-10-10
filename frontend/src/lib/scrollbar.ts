/**
 * Width of a classic, space-taking scrollbar on this device: about 15px on
 * Windows, or on macOS with "always show scroll bars"; 0 where scrollbars
 * overlay the content. Pages that never scroll use it to line up with pages
 * that keep room for one.
 */
export function measureScrollbarWidth(): number {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll'
  document.body.append(probe)
  const width = probe.offsetWidth - probe.clientWidth
  probe.remove()
  return width
}

export function applyScrollbarWidth(): void {
  document.documentElement.style.setProperty('--scrollbar-width', `${measureScrollbarWidth()}px`)
}

/** Measures now, and again whenever the window resizes; browser zoom changes the width in CSS pixels. */
export function watchScrollbarWidth(): void {
  applyScrollbarWidth()
  window.addEventListener('resize', applyScrollbarWidth)
}
