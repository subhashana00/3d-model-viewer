import { ModelInfo } from '@/types'

interface ModelInfoPanelProps {
  info: ModelInfo | null
}

function ModelInfoPanel({ info }: ModelInfoPanelProps) {
  if (!info) return null

  return (
    <div className="model-info-panel z-50 glass animate-fade-in">
      <div className="text-xs sm:text-sm font-semibold text-white mb-0.5 sm:mb-1 max-w-[140px] sm:max-w-[200px] truncate">
        {info.name}
      </div>
      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-white/40">
        <span>{info.type}</span>
        <span className="opacity-50">•</span>
        <span>{info.size}</span>
      </div>
      {info.source === 'depth-generated' && (
        <div className="hidden sm:block mt-2 max-w-[240px] text-[10px] text-white/30 leading-relaxed">
          ⓘ Generated using depth estimation — may not represent full geometry
        </div>
      )}
    </div>
  )
}

export default ModelInfoPanel
