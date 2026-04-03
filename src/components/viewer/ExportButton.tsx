import { useState } from 'react'

interface ExportButtonProps {
  onExportImage: () => void
  onExportModel: () => void
  format: string
  showModelExport?: boolean
}

function ExportButton({ onExportImage, onExportModel, format, showModelExport }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleExportImage = async () => {
    setIsExporting(true)
    setShowMenu(false)
    try {
      await onExportImage()
    } finally {
      setTimeout(() => setIsExporting(false), 500)
    }
  }

  const handleExportModel = async () => {
    setIsExporting(true)
    setShowMenu(false)
    try {
      await onExportModel()
    } finally {
      setTimeout(() => setIsExporting(false), 500)
    }
  }

  return (
    <div className="export-button-wrapper">
      <div className="relative">
        <button
          className={`export-main-btn ${isExporting ? 'exporting' : ''}`}
          onClick={() => showModelExport ? setShowMenu(!showMenu) : handleExportImage()}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <span className="export-spinner" />
              Exporting...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
              {showModelExport && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              )}
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        {showMenu && showModelExport && (
          <div className="export-dropdown animate-fade-in">
            <button onClick={handleExportImage} className="export-dropdown-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Export as {format.toUpperCase()}
            </button>
            <button onClick={handleExportModel} className="export-dropdown-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              Export as GLB
            </button>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showMenu && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}

export default ExportButton
