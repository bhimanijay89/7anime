import React, { useState, useEffect } from 'react'
import { X, Check, User, FileText, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { Button } from '../ui/Button'
import './avatar-modal.css'

export interface EditProfileModalProps {
  isOpen: boolean
  currentDisplayName?: string | null
  currentBio?: string | null
  username: string
  onClose: () => void
  onSaveProfile: (data: { displayName: string; bio: string }) => Promise<boolean>
}

export function EditProfileModal({
  isOpen,
  currentDisplayName,
  currentBio,
  username,
  onClose,
  onSaveProfile,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState<string>(currentDisplayName || username)
  const [bio, setBio] = useState<string>(currentBio || '')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentDisplayName || username)
      setBio(currentBio || '')
      setError(null)
      setIsSaving(false)
    }
  }, [isOpen, currentDisplayName, currentBio, username])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedName = displayName.trim()
    if (!trimmedName) {
      setError('Display name cannot be empty.')
      return
    }
    if (trimmedName.length > 50) {
      setError('Display name cannot exceed 50 characters.')
      return
    }
    if (bio.length > 250) {
      setError('Bio cannot exceed 250 characters.')
      return
    }

    setIsSaving(true)
    try {
      const success = await onSaveProfile({
        displayName: trimmedName,
        bio: bio.trim(),
      })
      if (success) {
        onClose()
      } else {
        setError('Failed to update profile. Please try again.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="avatar-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      onClick={onClose}
    >
      <div
        className="avatar-modal__dialog glass-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="avatar-modal__header">
          <div className="avatar-modal__title-group">
            <span className="avatar-modal__eyebrow">
              <Sparkles size={14} /> Profile Settings
            </span>
            <h2 id="edit-profile-title">Edit Profile Information</h2>
          </div>
          <button
            type="button"
            className="avatar-modal__close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </header>

        {error && (
          <div className="avatar-modal__error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="edit-profile-form">
          {/* Display Name Field */}
          <div className="form-group">
            <label htmlFor="edit-profile-display-name">
              <User size={15} />
              <span>Display Name</span>
            </label>
            <input
              id="edit-profile-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="e.g. Monkey D. Luffy"
              className="glass-input"
              autoFocus
            />
            <div className="form-hint">
              <span>Your public profile name</span>
              <span>{displayName.length}/50</span>
            </div>
          </div>

          {/* User Bio Field */}
          <div className="form-group">
            <label htmlFor="edit-profile-bio">
              <FileText size={15} />
              <span>Bio / Status Quote</span>
            </label>
            <textarea
              id="edit-profile-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={250}
              placeholder="Tell other anime fans a bit about yourself or your favorite anime..."
              className="glass-textarea"
            />
            <div className="form-hint">
              <span>Appears on your profile identity card</span>
              <span>{bio.length}/250</span>
            </div>
          </div>

          <footer className="avatar-modal__footer">
            <div className="avatar-modal__footer-right" style={{ marginLeft: 'auto' }}>
              <Button variant="ghost" type="button" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}
