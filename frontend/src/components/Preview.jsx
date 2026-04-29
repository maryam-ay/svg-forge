import { useMemo } from 'react'

function ImagePlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5
           1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5
           1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25
           6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375
           0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  )
}

export default function Preview({ originalUrl, svgContent, converting }) {
  // Build a stable data-URL so the browser renders the SVG as a raster image.
  // This avoids dangerouslySetInnerHTML while still showing an accurate preview.
  const svgDataUrl = useMemo(() => {
    if (!svgContent) return null
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`
  }, [svgContent])

  return (
    <div className="preview-section">
      {/* ── Column headers ── */}
      <div className="preview-header">
        <div className="preview-label">
          <span className="preview-label-dot" />
          Original
        </div>
        <div className="preview-label">
          <span className={`preview-label-dot${svgContent ? ' dot-ready' : ''}`} />
          SVG Output
        </div>
      </div>

      {/* ── Side-by-side panels ── */}
      <div className="preview-panels">
        {/* Original image */}
        <div className="preview-panel">
          {originalUrl ? (
            <img
              src={originalUrl}
              alt="Original"
              className="preview-img"
              draggable={false}
            />
          ) : (
            <div className="preview-placeholder">
              <ImagePlaceholderIcon />
              <span>Upload an image to preview</span>
            </div>
          )}
        </div>

        {/* SVG result */}
        <div className="preview-panel">
          {converting ? (
            <div className="preview-loading">
              <span className="spinner-lg" />
              <span>Converting&hellip;</span>
            </div>
          ) : svgDataUrl ? (
            <img
              src={svgDataUrl}
              alt="SVG output"
              className="preview-img"
              draggable={false}
            />
          ) : (
            <div className="preview-placeholder">
              <ImagePlaceholderIcon />
              <span>SVG will appear here</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
