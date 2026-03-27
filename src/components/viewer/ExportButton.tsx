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
    <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50 animate-fade-in">
      {/* Main Export Button */}
      <div className="relative">
        <button 
          className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold text-white rounded-2xl transition-all duration-300
            ${isExporting 
              ? 'bg-black/80 text-white/60' 
              : 'bg-gradient-to-r from-accent to-purple-500 shadow-[0_0_40px_rgba(99,102,241,0.15)] hover:shadow-[0_0_60px_rgba(99,102,241,0.3)]'
            }`}
          onClick={() => showModelExport ? setShowMenu(!showMenu) : handleExportImage()}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <span className="w-[18px] h-[18px] border-2 border-white/10 border-t-accent rounded-full animate-spin-slow" />
              Exporting...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
              {showModelExport && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              )}
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        {showMenu && showModelExport && (
          <div className="absolute left-0 bottom-full mb-2 w-48 py-2 rounded-xl glass animate-fade-in">
            <button
              onClick={handleExportImage}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Export as {format.toUpperCase()}
            </button>
            <button
              onClick={handleExportModel}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
