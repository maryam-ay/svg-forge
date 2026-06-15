import { useState, useCallback, useMemo, useEffect } from 'react'
import DropZone from './components/DropZone.jsx'
import Controls from './components/Controls.jsx'
import Preview from './components/Preview.jsx'

// ─── Icons ───────────────────────────────────────────────────────────────────

function ForgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  )
}

function ConvertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [file, setFile] = useState(null)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [svgContent, setSvgContent] = useState(null)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState(null)
  const [retryMsg, setRetryMsg] = useState(null)

  const [settings, setSettings] = useState({
    preset: 'high',
    colorPrecision: 8,
    filterSpeckle: 1,
    cornerThreshold: 60,
    pathPrecision: 8,
    lengthThreshold: 3,
    mode: 'color',
  })

  useEffect(() => {
    fetch('https://svg-forge-backend.onrender.com/health').catch(() => {})
  }, [])

  const handleFile = useCallback((newFile) => {
    if (originalUrl) URL.revokeObjectURL(originalUrl)
    setFile(newFile)
    setOriginalUrl(URL.createObjectURL(newFile))
    setSvgContent(null)
    setError(null)
  }, [originalUrl])

  const handleConvert = async () => {
    if (!file || converting) return
    setConverting(true)
    setError(null)
    setRetryMsg(null)

    const RETRY_INTERVAL = 10000
    const MAX_RETRIES = 18  // 18 × 10s = 3 minutes
    let lastError = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        setRetryMsg(`Server is waking up, this may take up to a minute on first use… (attempt ${attempt}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL))
      }

      const form = new FormData()
      form.append('file', file)
      form.append('color_precision', settings.colorPrecision)
      form.append('filter_speckle', settings.filterSpeckle)
      form.append('corner_threshold', settings.cornerThreshold)
      form.append('path_precision', settings.pathPrecision)
      form.append('length_threshold', settings.lengthThreshold)
      form.append('mode', settings.mode === 'bw' ? 'bw' : 'color')

      try {
        const res = await fetch('https://svg-forge-backend.onrender.com/convert', { method: 'POST', body: form })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ detail: 'Conversion failed' }))
          const err = new Error(data.detail || 'Conversion failed')
          err.status = res.status
          throw err
        }
        const svg = await res.text()
        setSvgContent(svg)
        setRetryMsg(null)
        setConverting(false)
        return
      } catch (err) {
        lastError = err
        const isRetryable = err instanceof TypeError || (err.status >= 500)
        if (!isRetryable || attempt === MAX_RETRIES) break
      }
    }

    setError(lastError.message)
    setRetryMsg(null)
    setConverting(false)
  }

  const handleDownload = () => {
    if (!svgContent) return
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file
      ? file.name.replace(/\.[^.]+$/, '.svg')
      : 'output.svg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const svgBytes = useMemo(() =>
    svgContent ? new TextEncoder().encode(svgContent).length : 0,
    [svgContent]
  )

  const showPreview = !!(originalUrl || converting || svgContent)

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <div className="header-icon-wrap">
            <ForgeIcon />
          </div>
          <h1>SVG Forge</h1>
        </div>
        <p className="header-tagline">
          Convert raster images to clean, scalable vector graphics
        </p>
      </header>

      <main className="main">
        <DropZone file={file} originalUrl={originalUrl} onFile={handleFile} />

        {file && (
          <Controls settings={settings} onChange={setSettings} />
        )}

        {file && (
          <button
            className="convert-btn"
            onClick={handleConvert}
            disabled={converting}
          >
            {converting ? (
              <>
                <span className="spinner" />
                Converting&hellip;
              </>
            ) : (
              <>
                <ConvertIcon />
                Convert to SVG
              </>
            )}
          </button>
        )}

        {retryMsg && (
          <div className="retry-banner" role="status">
            <span className="spinner" />
            {retryMsg}
          </div>
        )}

        {error && (
          <div className="error-banner" role="alert">
            <ErrorIcon />
            {error}
          </div>
        )}

        {showPreview && (
          <Preview
            originalUrl={originalUrl}
            svgContent={svgContent}
            converting={converting}
          />
        )}

        {svgContent && (
          <div className="download-row">
            <div className="download-info">
              <CheckIcon />
              SVG ready &mdash; {formatBytes(svgBytes)}
            </div>
            <button className="download-btn" onClick={handleDownload}>
              <DownloadIcon />
              Download SVG
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
