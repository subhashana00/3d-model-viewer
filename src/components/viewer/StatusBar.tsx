import { ModelInfo, TransformMode } from '@/types'

interface StatusBarProps {
  info: ModelInfo | null
  transformMode: TransformMode
  onZoomFit: () => void
}

function StatusBar({ info, transformMode, onZoomFit }: StatusBarProps) {
  const modeLabels: Record<TransformMode, string> = {
    orbit: 'Orbit Camera',
    grab: 'Move Model',
    rotate: 'Rotate Model',
    scale: 'Scale Model',
  }

  return (
    <div className="figma-statusbar">
      <div className="statusbar-left">
        {info && (
          <>
            <div className="statusbar-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              <span className="statusbar-filename">{info.name}</span>
            </div>
            <span className="statusbar-divider">|</span>
            <span className="statusbar-meta">{info.type}</span>
            <span className="statusbar-meta">{info.size}</span>
          </>
        )}
      </div>
      <div className="statusbar-center">
        <span className="statusbar-mode-indicator">
          <span className={`mode-dot ${transformMode !== 'orbit' ? 'active' : ''}`} />
          {modeLabels[transformMode]}
        </span>
      </div>
      <div className="statusbar-right">
        <button className="statusbar-action" onClick={onZoomFit} title="Zoom to Fit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
          Fit
        </button>
      </div>
    </div>
  )
}

export default StatusBar
