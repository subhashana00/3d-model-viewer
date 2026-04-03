import { TransformMode } from '@/types'

interface ToolbarProps {
  transformMode: TransformMode
  onModeChange: (mode: TransformMode) => void
  onResetTransform: () => void
  zoom?: number
}

function Toolbar({ transformMode, onModeChange, onResetTransform }: ToolbarProps) {
  const tools: { mode: TransformMode; icon: JSX.Element; label: string; shortcut: string }[] = [
    {
      mode: 'orbit',
      label: 'Orbit',
      shortcut: 'V',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      ),
    },
    {
      mode: 'grab',
      label: 'Move',
      shortcut: 'G',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 9l-3 3 3 3" />
          <path d="M9 5l3-3 3 3" />
          <path d="M15 19l-3 3-3-3" />
          <path d="M19 9l3 3-3 3" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="12" y1="2" x2="12" y2="22" />
        </svg>
      ),
    },
    {
      mode: 'rotate',
      label: 'Rotate',
      shortcut: 'R',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6" />
          <path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
        </svg>
      ),
    },
    {
      mode: 'scale',
      label: 'Scale',
      shortcut: 'S',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      ),
    },
  ]

  return (
    <div className="figma-toolbar">
      <div className="toolbar-tools">
        {tools.map(({ mode, icon, label, shortcut }) => (
          <button
            key={mode}
            className={`toolbar-btn ${transformMode === mode ? 'active' : ''}`}
            onClick={() => onModeChange(mode)}
            title={`${label} (${shortcut})`}
          >
            {icon}
            <span className="toolbar-tooltip">{label}<kbd>{shortcut}</kbd></span>
          </button>
        ))}

        <div className="toolbar-separator" />

        <button
          className="toolbar-btn"
          onClick={onResetTransform}
          title="Reset Transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
          <span className="toolbar-tooltip">Reset<kbd>X</kbd></span>
        </button>
      </div>
    </div>
  )
}

export default Toolbar
