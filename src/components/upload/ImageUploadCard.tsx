import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react'

const ACCEPTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp']

interface ImageUploadCardProps {
  onGenerate: (file: File) => void
}

function ImageUploadCard({ onGenerate }: ImageUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_FORMATS.includes(extension)) {
      return `Invalid format. Please upload ${ACCEPTED_FORMATS.join(', ')} files.`
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File too large. Maximum size is 10MB.'
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
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])

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

  const handleClick = () => fileInputRef.current?.click()

  const handleGenerate = () => {
    if (!selectedFile) return
    onGenerate(selectedFile)
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreview(null)
    setError(null)
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4 sm:p-6 pt-16 sm:pt-20 overflow-auto">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#0a0a0a_50%)]" />
        <div className="absolute top-1/4 left-1/4 w-56 sm:w-96 h-56 sm:h-96 bg-purple-500/10 rounded-full blur-[90px] sm:blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-80 h-48 sm:h-80 bg-pink-500/10 rounded-full blur-[80px] sm:blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-[580px] animate-fade-in-up">
        <div className="relative p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-[32px] bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/[0.08] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
          <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

          {/* Header */}
          <div className="text-center mb-5 sm:mb-8">
            <div className="relative w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl rotate-6 opacity-50" />
              <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl shadow-lg shadow-purple-500/25">
                <svg className="w-7 h-7 sm:w-9 sm:h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-400 rounded-full animate-ping" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-[32px] font-bold mb-2 sm:mb-3 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Image to 3D
            </h1>
            <p className="text-white/50 text-[13px] sm:text-[15px] max-w-xs mx-auto px-2">
              Create a depth-based 3D model from any 2D image — completely free
            </p>
          </div>

          {/* Content */}
          <div className="space-y-4 sm:space-y-5">
            {/* Image Upload / Preview */}
            {preview ? (
              <div className="relative group">
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border-2 border-white/10">
                  <img src={preview} alt="Preview" className="w-full h-40 sm:h-52 object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-white text-xs sm:text-sm font-medium hover:bg-white/20 transition-all"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="1 4 1 10 7 10"/>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                      </svg>
                      Change Image
                    </button>
                  </div>
                </div>
                <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 px-2 sm:px-3 py-1 sm:py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                  <p className="text-[10px] sm:text-xs text-white/80 font-medium truncate max-w-[150px] sm:max-w-[200px]">{selectedFile?.name}</p>
                </div>
              </div>
            ) : (
              <div
                className={`relative p-6 sm:p-10 border-2 border-dashed rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 group
                  ${isDragging
                    ? 'border-purple-500 bg-purple-500/10 scale-[1.02]'
                    : 'border-white/10 hover:border-purple-500/50 hover:bg-white/[0.02]'
                  }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
              >
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleInputChange} className="hidden" />
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-300
                    ${isDragging ? 'bg-purple-500/20 text-purple-400 scale-110' : 'bg-white/5 text-white/40 group-hover:bg-purple-500/10 group-hover:text-purple-400'}`}>
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                      <path d="M12 12v9"/>
                      <path d="m8 17 4-5 4 5"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm sm:text-base font-medium text-white mb-1">
                      {isDragging ? 'Drop your image here' : 'Drop image or click to browse'}
                    </p>
                    <p className="text-xs sm:text-sm text-white/40">JPG, PNG, WebP • Max 10MB</p>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!selectedFile}
              className={`relative w-full py-3 sm:py-4 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 overflow-hidden group
                ${selectedFile
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
            >
              {selectedFile && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
              <span className="relative flex items-center justify-center gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Generate 3D Model
              </span>
            </button>

            {error && (
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-red-500/10 rounded-xl text-red-400 text-xs sm:text-sm animate-fade-in">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mt-4 sm:mt-6 flex-wrap">
          {['100% Free', 'Client-Side', 'Export GLB'].map((feature) => (
            <span key={feature} className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-white/40 bg-white/5 rounded-full border border-white/5">
              {feature}
            </span>
          ))}
        </div>

        <p className="text-center mt-4 sm:mt-6 text-white/30 text-[10px] sm:text-xs">
          Depth-based pseudo-3D • Best with photos that have clear perspective
        </p>
      </div>
    </div>
  )
}

export default ImageUploadCard
