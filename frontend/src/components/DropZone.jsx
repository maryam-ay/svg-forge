import { useRef, useState, useCallback } from 'react'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ACCEPT_ATTR    = ACCEPTED_TYPES.join(',')

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function UploadCloudIcon() {
  return (
    <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none"
         strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775
           5.25 5.25 0 0 1 10.338-2.32 3.75 3.75 0 0 1 3.232 5.574 3.75
           3.75 0 0 1-4.41 3.52" />
    </svg>
  )
}

export default function DropZone({ file, originalUrl, onFile }) {
  const inputRef  = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const processFile = useCallback((f) => {
    if (!f) return
    if (!ACCEPTED_TYPES.includes(f.type)) {
      alert(`"${f.type || f.name}" is not supported.\nPlease upload a PNG, JPG, or WebP image.`)
      return
    }
    onFile(f)
  }, [onFile])

  const openPicker = () => inputRef.current?.click()

  const handleInputChange = (e) => {
    processFile(e.target.files?.[0])
    e.target.value = '' // reset so same file can be re-selected
  }

  const handleDragOver  = (e) => { e.preventDefault(); setDragActive(true)  }
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false) }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    processFile(e.dataTransfer.files?.[0])
  }

  return (
    <div
      className={`dropzone-wrapper${dragActive ? ' drag-active' : ''}`}
      onClick={file ? undefined : openPicker}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openPicker()}
      aria-label="Upload image — click or drag and drop"
    >
      <input
        ref={inputRef}
        className="dropzone-input"
        type="file"
        accept={ACCEPT_ATTR}
        onChange={handleInputChange}
      />

      {file ? (
        /* ── File selected ── */
        <div className="dropzone-selected">
          {originalUrl && (
            <img src={originalUrl} alt="Selected" className="dropzone-thumb" />
          )}
          <div className="dropzone-file-info">
            <div className="dropzone-file-name">{file.name}</div>
            <div className="dropzone-file-size">{formatSize(file.size)}</div>
          </div>
          <button
            className="dropzone-change-btn"
            onClick={(e) => { e.stopPropagation(); openPicker() }}
          >
            Change file
          </button>
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="dropzone-inner">
          <UploadCloudIcon />
          <div className="dropzone-text">
            <strong>
              <span className="dropzone-accent-text">Click to upload</span>
              {' '}or drag &amp; drop
            </strong>
            <span>PNG &middot; JPG &middot; WebP</span>
          </div>
        </div>
      )}
    </div>
  )
}
