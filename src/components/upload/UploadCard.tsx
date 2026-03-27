import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react'

const ACCEPTED_FORMATS = ['.glb', '.gltf', '.obj']

interface UploadCardProps {
  onFileUpload: (file: File) => void
}

function UploadCard({ onFileUpload }: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_FORMATS.includes(extension)) {
      return `Invalid format. Please upload ${ACCEPTED_FORMATS.join(', ')} files.`
    }
    return null
  }

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    onFileUpload(file)
  }, [onFileUpload])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-6 pt-20 overflow-auto">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a1a2e_0%,#0a0a0a_50%)]" />
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="w-full max-w-[540px] animate-fade-in-up">
        {/* Main Card */}
        <div className="relative p-8 md:p-12 rounded-[32px] bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/[0.08] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
          
          {/* Decorative top line */}
          <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

          {/* Header */}
          <div className="text-center mb-10">
            {/* 3D Icon */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl rotate-6 opacity-40" />
              <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl shadow-indigo-500/20">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
            </div>

            <h1 className="text-3xl md:text-[34px] font-bold mb-3 bg-gradient-to-r from-white via-indigo-200 to-white bg-clip-text text-transparent">
              3D Model Viewer
            </h1>
            <p className="text-white/50 text-[15px] max-w-sm mx-auto">
              Upload your 3D model to preview, customize, and export stunning images
            </p>
          </div>
          
          {/* Dropzone */}
          <div 
            className={`relative p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group
              ${isDragging 
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' 
                : 'border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.02]'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf,.obj"
              onChange={handleInputChange}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 flex items-center justify-center rounded-2xl transition-all duration-300
                ${isDragging ? 'bg-indigo-500/20 text-indigo-400 scale-110' : 'bg-white/5 text-white/40 group-hover:bg-indigo-500/10 group-hover:text-indigo-400'}`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                  <path d="M12 12v9"/>
                  <path d="m8 17 4-5 4 5"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-white mb-1">
                  {isDragging ? 'Drop your model here' : 'Drop 3D model or click to browse'}
                </p>
                <p className="text-sm text-white/40">
                  GLB, GLTF, OBJ formats supported
                </p>
              </div>
            </div>
          </div>
          
          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 mt-5 px-4 py-3 bg-red-500/10 rounded-xl text-red-400 text-sm animate-fade-in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          {['Orbit Controls', 'Export PNG/JPEG', 'Custom Lighting'].map((feature) => (
            <span 
              key={feature}
              className="px-3 py-1.5 text-xs font-medium text-white/40 bg-white/5 rounded-full border border-white/5"
            >
              {feature}
            </span>
          ))}
        </div>
        
        {/* Footer */}
        <p className="text-center mt-6 text-white/30 text-xs">
          Built for designers & developers
        </p>
      </div>
    </div>
  )
}

export default UploadCard
