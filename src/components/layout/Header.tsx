interface HeaderProps {
  onReplace: () => void
  modelSource?: 'upload' | 'depth-generated'
}

function Header({ onReplace, modelSource }: HeaderProps) {
  return (
    <header className="fixed top-6 left-6 flex items-center gap-6 z-50 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className={`w-10 h-10 flex items-center justify-center rounded-xl text-white
          ${modelSource === 'depth-generated' 
            ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
            : 'bg-gradient-to-br from-accent to-purple-500'
          }`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <div>
          <span className="text-base font-semibold text-white">3D Viewer</span>
          {modelSource === 'depth-generated' && (
            <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md">
              Depth 3D
            </span>
          )}
        </div>
      </div>
      <button 
        className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white/60 glass rounded-xl hover:bg-white/[0.08] hover:text-white transition-all"
        onClick={onReplace}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        New Model
      </button>
    </header>
  )
}

export default Header
