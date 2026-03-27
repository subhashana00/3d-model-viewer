import { AppMode } from '@/types'

interface ModeSwitchProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
}

function ModeSwitch({ mode, onModeChange }: ModeSwitchProps) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center p-1.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
        <button
          className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300
            ${mode === 'upload' 
              ? 'bg-white text-gray-900 shadow-lg' 
              : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          onClick={() => onModeChange('upload')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload Model
        </button>
        <button
          className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300
            ${mode === 'depth' 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
              : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          onClick={() => onModeChange('depth')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          Image to 3D
          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wide
            ${mode === 'depth' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>
            Free
          </span>
        </button>
      </div>
    </div>
  )
}

export default ModeSwitch
