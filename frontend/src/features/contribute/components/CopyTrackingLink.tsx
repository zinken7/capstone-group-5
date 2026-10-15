import { useEffect, useRef, useState } from 'react'

import { trackingLink } from '../my-contributions'

/**
 * Copies a submission's private tracking link (FR-61). When the browser will
 * not copy, the link is shown, selected, for the contributor to copy themselves.
 */
function CopyTrackingLink({ id, contributionKey }: { id: number; contributionKey: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const link = trackingLink(id, contributionKey)

  useEffect(() => {
    if (state === 'manual') inputRef.current?.select()
    if (state !== 'copied') return
    const timer = window.setTimeout(() => setState('idle'), 4000)
    return () => window.clearTimeout(timer)
  }, [state])

  function copy() {
    if (!navigator.clipboard) {
      setState('manual')
      return
    }
    navigator.clipboard.writeText(link).then(() => setState('copied'), () => setState('manual'))
  }

  return (
    <div className="tracking-link">
      <button className="text-button text-button--flush" type="button" onClick={copy}>Copy tracking link</button>
      {state === 'copied' && <span className="form-help" role="status">Copied. Anyone with this link can see and update the submission, so keep it private.</span>}
      {state === 'manual' && (
        <label className="tracking-link__manual">
          <span className="form-help">Copy this private link. Anyone with it can see and update the submission.</span>
          <input ref={inputRef} readOnly value={link} onFocus={(event) => event.target.select()} />
        </label>
      )}
    </div>
  )
}

export default CopyTrackingLink
