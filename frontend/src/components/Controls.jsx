// ─── Preset definitions ──────────────────────────────────────────────────────

export const PRESETS = {
  high: {
    label: 'High Quality',
    hint: 'Best for logos, icons & text',
    colorPrecision: 8,
    filterSpeckle: 1,
    cornerThreshold: 60,
    pathPrecision: 8,
    lengthThreshold: 3,
  },
  balanced: {
    label: 'Balanced',
    hint: 'Good all-rounder for most images',
    colorPrecision: 6,
    filterSpeckle: 4,
    cornerThreshold: 60,
    pathPrecision: 6,
    lengthThreshold: 4,
  },
  fast: {
    label: 'Fast',
    hint: 'Quick preview, works well for photos',
    colorPrecision: 4,
    filterSpeckle: 8,
    cornerThreshold: 60,
    pathPrecision: 3,
    lengthThreshold: 6,
  },
}

// ─── Slider ───────────────────────────────────────────────────────────────────

function Slider({ label, min, max, step = 1, value, onChange, lowHint, highHint }) {
  const pct = ((value - min) / (max - min)) * 100
  const hint = value <= min + (max - min) * 0.25
    ? lowHint
    : value >= min + (max - min) * 0.75
      ? highHint
      : ''

  return (
    <div className="control-group">
      <div className="control-label">
        <span>{label}</span>
        <span className="control-value">{value}</span>
      </div>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--pct': `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="control-hint">{hint}</div>
    </div>
  )
}

// ─── Controls ────────────────────────────────────────────────────────────────

export default function Controls({ settings, onChange }) {
  // Apply a named preset (preserves mode / any field not in the preset).
  const applyPreset = (key) => {
    onChange({ ...settings, ...PRESETS[key], preset: key })
  }

  // Update a single slider; any manual tweak marks the preset as custom.
  const setField = (key) => (val) =>
    onChange({ ...settings, [key]: val, preset: 'custom' })

  const activePreset = settings.preset  // 'high' | 'balanced' | 'fast' | 'custom'

  return (
    <div className="controls-card">
      {/* ── Quality preset ── */}
      <div className="preset-row">
        <div className="preset-row-header">
          <span className="control-label" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Quality Preset
          </span>
          <span className="preset-hint">
            {activePreset === 'custom'
              ? 'Custom settings'
              : PRESETS[activePreset]?.hint}
          </span>
        </div>

        <div className="preset-buttons">
          {Object.entries(PRESETS).map(([key, { label }]) => (
            <button
              key={key}
              className={`preset-btn${activePreset === key ? ' active' : ''}`}
              onClick={() => applyPreset(key)}
            >
              {label}
            </button>
          ))}
          {activePreset === 'custom' && (
            <button className="preset-btn custom-active" disabled>
              Custom
            </button>
          )}
        </div>
      </div>

      {/* ── Sliders ── */}
      <Slider
        label="Color Precision"
        min={1}
        max={8}
        value={settings.colorPrecision}
        onChange={setField('colorPrecision')}
        lowHint="Fewer colors"
        highHint="More colors"
      />

      <Slider
        label="Path Simplification"
        min={1}
        max={16}
        value={settings.filterSpeckle}
        onChange={setField('filterSpeckle')}
        lowHint="Fine detail"
        highHint="Simplified"
      />

      {/* ── Output mode toggle ── */}
      <div className="control-group">
        <div className="control-label">
          <span>Output Mode</span>
        </div>
        <div style={{ height: '5px' }} />
        <div className="toggle-options">
          <button
            className={`toggle-option${settings.mode === 'color' ? ' active' : ''}`}
            onClick={() => onChange({ ...settings, mode: 'color' })}
          >
            Color
          </button>
          <button
            className={`toggle-option${settings.mode === 'bw' ? ' active' : ''}`}
            onClick={() => onChange({ ...settings, mode: 'bw' })}
          >
            B &amp; W
          </button>
        </div>
      </div>
    </div>
  )
}
