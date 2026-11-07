import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Trash2,
  ZoomIn,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '../ui/Button'
import './avatar-modal.css'

export interface AvatarModalProps {
  isOpen: boolean
  currentAvatar?: string | null
  username: string
  onClose: () => void
  onSaveAvatar: (avatarDataUrl: string) => Promise<boolean>
  onRemoveAvatar: () => Promise<boolean>
}

// Curated high-aesthetic anime profile presets
const ANIME_PRESETS = [
  {
    id: 'luffy',
    name: 'Pirate King',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 'shinobi',
    name: 'Ninja Spirit',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 'cyber',
    name: 'Cyber Neo',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 'swordsman',
    name: 'Blade Master',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 'mystic',
    name: 'Jujutsu Aura',
    url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 'solaris',
    name: 'Solar Flare',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=320&q=80',
  },
]

export function AvatarModal({
  isOpen,
  currentAvatar,
  username,
  onClose,
  onSaveAvatar,
  onRemoveAvatar,
}: AvatarModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'presets'>('upload')
  const [previewSrc, setPreviewSrc] = useState<string | null>(currentAvatar || null)
  const [zoom, setZoom] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isRemoving, setIsRemoving] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageElementRef = useRef<HTMLImageElement | null>(null)

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setPreviewSrc(currentAvatar || null)
      setZoom(1)
      setError(null)
      setIsSaving(false)
      setIsRemoving(false)
    }
  }, [isOpen, currentAvatar])

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null)
      const file = e.target.files?.[0]
      if (!file) return

      // Validate MIME type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (JPG, PNG, or WebP).')
        return
      }

      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file is too large. Maximum allowed size is 5MB.')
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setPreviewSrc(result)
        setZoom(1)
      }
      reader.onerror = () => {
        setError('Failed to read image file. Please try another one.')
      }
      reader.readAsDataURL(file)
    },
    [],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setError(null)

      const file = e.dataTransfer.files?.[0]
      if (!file) return

      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        setError('Please drop a valid image file (JPG, PNG, or WebP).')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Image file is too large. Maximum allowed size is 5MB.')
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setPreviewSrc(result)
        setZoom(1)
      }
      reader.readAsDataURL(file)
    },
    [],
  )

  const handleSelectPreset = (url: string) => {
    setError(null)
    setPreviewSrc(url)
    setZoom(1)
  }

  const exportCroppedAvatar = async (): Promise<string | null> => {
    if (!previewSrc) return null

    // If it's already an external URL or webp and not manipulated, check if canvas crop is needed
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas')
        const size = 320 // high-DPI avatar size
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(previewSrc)
          return
        }

        ctx.clearRect(0, 0, size, size)

        // Draw cropped & zoomed circle
        const minDim = Math.min(img.width, img.height)
        const cropSize = minDim / zoom
        const cropX = (img.width - cropSize) / 2
        const cropY = (img.height - cropSize) / 2

        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropSize,
          cropSize,
          0,
          0,
          size,
          size,
        )

        try {
          const dataUrl = canvas.toDataURL('image/webp', 0.9)
          resolve(dataUrl)
        } catch {
          // If crossOrigin taint happens on external URL, return previewSrc directly
          resolve(previewSrc)
        }
      }
      img.onerror = () => {
        resolve(previewSrc)
      }
      img.src = previewSrc
    })
  }

  const handleSave = async () => {
    if (!previewSrc) {
      setError('Please select or upload an avatar image.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const processed = await exportCroppedAvatar()
      if (!processed) {
        throw new Error('Image processing failed')
      }

      const success = await onSaveAvatar(processed)
      if (success) {
        onClose()
      } else {
        setError('Failed to save avatar. Please try again.')
      }
    } catch (err) {
      console.error('[AvatarModal] Save failed:', err)
      setError('An error occurred while uploading. Please check your network and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    setError(null)
    try {
      const success = await onRemoveAvatar()
      if (success) {
        setPreviewSrc(null)
        onClose()
      } else {
        setError('Failed to remove custom avatar.')
      }
    } catch {
      setError('An error occurred while removing your avatar.')
    } finally {
      setIsRemoving(false)
    }
  }

  if (!isOpen) return null

  const initial = username ? username.slice(0, 1).toUpperCase() : '7'

  return (
    <div
      className="avatar-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-modal-title"
      onClick={onClose}
    >
      <div
        className="avatar-modal__dialog glass-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden Canvas for High-DPI Crop Export */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Modal Header */}
        <header className="avatar-modal__header">
          <div className="avatar-modal__title-group">
            <span className="avatar-modal__eyebrow">
              <Sparkles size={14} /> Profile Personalization
            </span>
            <h2 id="avatar-modal-title">Customize Profile Picture</h2>
          </div>
          <button
            type="button"
            className="avatar-modal__close-btn"
            onClick={onClose}
            aria-label="Close avatar modal"
          >
            <X size={18} />
          </button>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="avatar-modal__error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Interactive Avatar Preview & Ring */}
        <div className="avatar-modal__preview-section">
          <div className="avatar-preview-container">
            <div className="avatar-ring avatar-ring--animated" />
            <div className="avatar-preview-mask">
              {previewSrc ? (
                <img
                  ref={imageElementRef}
                  src={previewSrc}
                  alt="Avatar Preview"
                  className="avatar-preview-img"
                  style={{ transform: `scale(${zoom})` }}
                />
              ) : (
                <div className="avatar-preview-placeholder">{initial}</div>
              )}
            </div>
          </div>

          <div className="avatar-modal__preview-info">
            <strong>{username}</strong>
            <span>Preview in Liquid Glass Ring</span>
          </div>
        </div>

        {/* Zoom Controls (when image is present) */}
        {previewSrc && (
          <div className="avatar-modal__zoom-control">
            <ZoomIn size={15} className="avatar-modal__zoom-icon" />
            <label htmlFor="avatar-zoom-slider" className="sr-only">
              Avatar Zoom
            </label>
            <input
              id="avatar-zoom-slider"
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="avatar-zoom-slider"
            />
            <span className="avatar-zoom-value">{Math.round(zoom * 100)}%</span>
          </div>
        )}

        {/* Navigation Tabs (Upload vs Presets) */}
        <div className="avatar-modal__tabs">
          <button
            type="button"
            className={`avatar-tab ${activeTab === 'upload' ? 'avatar-tab--active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={14} />
            <span>Upload Photo</span>
          </button>
          <button
            type="button"
            className={`avatar-tab ${activeTab === 'presets' ? 'avatar-tab--active' : ''}`}
            onClick={() => setActiveTab('presets')}
          >
            <ImageIcon size={14} />
            <span>Anime Presets</span>
          </button>
        </div>

        {/* Tab 1: File Upload */}
        {activeTab === 'upload' && (
          <div
            className="avatar-modal__dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div className="avatar-modal__dropzone-icon">
              <Upload size={24} />
            </div>
            <div className="avatar-modal__dropzone-text">
              <strong>Click to upload or drag & drop</strong>
              <span>JPG, PNG, or WebP up to 5MB</span>
            </div>
          </div>
        )}

        {/* Tab 2: Anime Presets */}
        {activeTab === 'presets' && (
          <div className="avatar-presets__grid">
            {ANIME_PRESETS.map((preset) => {
              const isSelected = previewSrc === preset.url
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`avatar-preset-btn ${isSelected ? 'avatar-preset-btn--selected' : ''}`}
                  onClick={() => handleSelectPreset(preset.url)}
                  title={preset.name}
                >
                  <img src={preset.url} alt={preset.name} loading="lazy" />
                  {isSelected && (
                    <span className="avatar-preset-check">
                      <Check size={12} />
                    </span>
                  )}
                  <span className="avatar-preset-name">{preset.name}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Modal Actions */}
        <footer className="avatar-modal__footer">
          {currentAvatar && (
            <Button
              variant="ghost"
              onClick={handleRemove}
              disabled={isSaving || isRemoving}
              className="avatar-btn--remove"
            >
              {isRemoving ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
              <span>Remove</span>
            </Button>
          )}

          <div className="avatar-modal__footer-right">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSaving || isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || isRemoving || !previewSrc}
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className="spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Save Avatar</span>
                </>
              )}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
