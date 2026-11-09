/* eslint-disable react-refresh/only-export-components */
// Kept separate from KnowledgeScene so the landing page can use these without loading three.js.
export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch { return false }
}

export function SceneFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
      <div className="relative w-[min(70vw,520px)] aspect-square">
        <div className="absolute inset-0 rounded-full bg-accent/30 blur-[90px]" />
        <div className="absolute inset-[18%] rounded-full border border-accent/30" />
        <div className="absolute inset-[32%] rounded-full border border-accent-2/30" />
        <div className="absolute inset-[44%] rounded-full bg-accent-gradient opacity-60 blur-md" />
      </div>
    </div>
  )
}

