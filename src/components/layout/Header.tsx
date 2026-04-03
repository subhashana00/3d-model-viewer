interface HeaderProps {
  onReplace: () => void
  modelSource?: 'upload' | 'depth-generated'
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

function Header({ onReplace, modelSource, canUndo, canRedo, onUndo, onRedo }: HeaderProps) {
  return (
    <header className="figma-header">
      <div className="header-left">
        <div className="header-logo">
          <div className={`header-logo-icon ${modelSource === 'depth-generated' ? 'depth' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <span className="header-title">3D Viewer</span>
          {modelSource === 'depth-generated' && (
            <span className="header-badge">Depth 3D</span>
          )}
        </div>

        <div className="header-nav-divider" />

        <button className="header-menu-btn" onClick={onReplace}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          New Model
        </button>
      </div>

      {/* Undo/Redo buttons — Figma style */}
      <div className="header-right">
        <div className="header-undo-redo">
          <button
            className={`header-icon-btn ${!canUndo ? 'disabled' : ''}`}
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
          </button>
          <button
            className={`header-icon-btn ${!canRedo ? 'disabled' : ''}`}
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
