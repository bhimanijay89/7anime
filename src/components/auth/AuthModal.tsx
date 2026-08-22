import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { AuthUser } from '../../types/auth'
import logoImg from '../../public/logo.png'
import { Modal } from '../ui/Overlay'
import './auth.css'

export interface AuthModalProps {
  open: boolean
  onClose: () => void
  onAuthenticated: (user: AuthUser) => void
  initialMode?: 'login' | 'register'
}

type AuthMode = 'login' | 'register' | 'forgot-email' | 'forgot-otp' | 'forgot-reset'

const BACKEND_URL = 'http://localhost:3001'

export function AuthModal({
  open,
  onClose,
  onAuthenticated,
  initialMode = 'login',
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)

  // Login & Register state
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Independent password visibility states
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)

  // Password reset flow state
  const [resetEmail, setResetEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  // Status state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const resetForm = () => {
    setEmail('')
    setUsername('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setShowNewPassword(false)
    setShowConfirmNewPassword(false)
    setResetEmail('')
    setOtpCode('')
    setResetToken('')
    setNewPassword('')
    setConfirmNewPassword('')
    setError(null)
    setSuccess(null)
  }

  const handleSwitchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setError(null)
    setSuccess(null)
    setShowPassword(false)
    setShowConfirmPassword(false)
    setShowNewPassword(false)
    setShowConfirmNewPassword(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // REGISTER VALIDATION
    if (mode === 'register') {
      if (!username.trim()) {
        setError('Username is required.')
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters long.')
        return
      }
    }

    // RESET PASSWORD VALIDATION
    if (mode === 'forgot-reset') {
      if (newPassword !== confirmNewPassword) {
        setError('Passwords do not match.')
        return
      }

      if (newPassword.length < 8) {
        setError('New password must be at least 8 characters long.')
        return
      }
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: email.trim(), password }),
        })
        const data = await response.json()

        if (response.ok && data.ok && data.data?.user) {
          resetForm()
          onAuthenticated(data.data.user as AuthUser)
        } else {
          setError(data.error?.message || 'Invalid email or password.')
        }
      } else if (mode === 'register') {
        const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password,
          }),
        })
        const data = await response.json()

        if (response.ok && data.ok && data.data?.user) {
          resetForm()
          onAuthenticated(data.data.user as AuthUser)
        } else {
          setError(data.error?.message || 'Registration failed.')
        }
      } else if (mode === 'forgot-email') {
        const targetEmail = (email || resetEmail).trim().toLowerCase()
        const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail }),
        })
        const data = await response.json()

        if (response.ok && data.ok) {
          setResetEmail(targetEmail)
          setSuccess(
            data.data?.message ||
              'If an account exists for this email, a verification code has been sent.',
          )
          setMode('forgot-otp')
        } else {
          setError(data.error?.message || 'Unable to send verification code.')
        }
      } else if (mode === 'forgot-otp') {
        const response = await fetch(`${BACKEND_URL}/api/auth/verify-reset-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: resetEmail.trim().toLowerCase(),
            code: otpCode.trim(),
          }),
        })
        const data = await response.json()

        if (response.ok && data.ok && data.data?.token) {
          setResetToken(data.data.token)
          setSuccess(data.data?.message || 'Verification code confirmed.')
          setMode('forgot-reset')
        } else {
          setError(data.error?.message || 'Invalid verification code.')
        }
      } else if (mode === 'forgot-reset') {
        const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: resetToken,
            password: newPassword,
          }),
        })
        const data = await response.json()

        if (response.ok && data.ok) {
          resetForm()
          setMode('login')
          setSuccess('Password updated successfully. Please sign in with your new password.')
        } else {
          setError(data.error?.message || 'Unable to reset password.')
        }
      }
    } catch {
      setError(
        'Unable to connect to authentication server. Please verify backend service is running.',
      )
    } finally {
      setLoading(false)
    }
  }

  const getModalTitle = () => {
    switch (mode) {
      case 'login':
        return 'Sign In'
      case 'register':
        return 'Create Account'
      case 'forgot-email':
        return 'Forgot Password'
      case 'forgot-otp':
        return 'Enter Verification Code'
      case 'forgot-reset':
        return 'Create New Password'
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={getModalTitle()}>
      <div className="auth-modal">
        {/* Header */}
        <div className="auth-modal__header">
          <div className="auth-modal__title-area">
            <div className="auth-modal__brand">
              <img src={logoImg} alt="7anime" className="auth-modal__logo" />
            </div>
            <p className="auth-modal__subtitle">
              {mode === 'login' &&
                'Sign in to access your watch list, history, and achievements'}
              {mode === 'register' &&
                'Create an account to start tracking your anime journey'}
              {mode === 'forgot-email' &&
                'Enter your registered email address to receive a 6-digit verification code'}
              {mode === 'forgot-otp' &&
                `Enter the 6-digit verification code sent to ${resetEmail}`}
              {mode === 'forgot-reset' &&
                'Choose a new strong password for your 7anime account'}
            </p>
          </div>
        </div>

        {/* Mode Tabs (only visible on login/register) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="auth-modal__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-modal__tab ${mode === 'login' ? 'auth-modal__tab--active' : ''}`}
              onClick={() => handleSwitchMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`auth-modal__tab ${mode === 'register' ? 'auth-modal__tab--active' : ''}`}
              onClick={() => handleSwitchMode('register')}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Success Banner */}
        {success && (
          <div className="auth-modal__success" role="status">
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="auth-modal__error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form className="auth-modal__form" onSubmit={handleSubmit}>
          {/* SIGNUP USERNAME */}
          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-username" className="auth-field__label">
                <User size={13} />
                Username
              </label>
              <div className="auth-field__input-wrap">
                <User size={15} className="auth-field__input-icon" />
                <input
                  id="auth-username"
                  type="text"
                  required
                  placeholder="e.g. jay"
                  className="auth-field__input"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* EMAIL INPUT (Login, Register, Forgot-Email) */}
          {(mode === 'login' || mode === 'register' || mode === 'forgot-email') && (
            <div className="auth-field">
              <label htmlFor="auth-email" className="auth-field__label">
                <Mail size={13} />
                Email Address
              </label>
              <div className="auth-field__input-wrap">
                <Mail size={15} className="auth-field__input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="auth-field__input"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value)
                    setResetEmail(e.target.value)
                  }}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* PASSWORD INPUT (Login, Register) */}
          {(mode === 'login' || mode === 'register') && (
            <div className="auth-field">
              <div className="auth-field__label-row">
                <label htmlFor="auth-password" className="auth-field__label">
                  <Lock size={13} />
                  Password
                </label>

                {mode === 'login' && (
                  <button
                    type="button"
                    className="auth-field__forgot-btn"
                    onClick={() => handleSwitchMode('forgot-email')}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="auth-field__input-wrap">
                <Lock size={15} className="auth-field__input-icon" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="auth-field__input auth-field__input--password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="auth-field__toggle-eye"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* CONFIRM PASSWORD INPUT (Register) */}
          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-confirm-password" className="auth-field__label">
                <Lock size={13} />
                Confirm Password
              </label>
              <div className="auth-field__input-wrap">
                <Lock size={15} className="auth-field__input-icon" />
                <input
                  id="auth-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="auth-field__input auth-field__input--password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="auth-field__toggle-eye"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* OTP CODE INPUT (Forgot OTP) */}
          {mode === 'forgot-otp' && (
            <div className="auth-field">
              <label htmlFor="auth-otp" className="auth-field__label">
                <ShieldCheck size={13} />
                6-Digit Verification Code
              </label>
              <div className="auth-field__input-wrap">
                <input
                  id="auth-otp"
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  className="auth-field__input auth-field__input--otp"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* NEW PASSWORD INPUTS (Forgot Reset) */}
          {mode === 'forgot-reset' && (
            <>
              <div className="auth-field">
                <label htmlFor="auth-new-password" className="auth-field__label">
                  <Lock size={13} />
                  New Password
                </label>
                <div className="auth-field__input-wrap">
                  <Lock size={15} className="auth-field__input-icon" />
                  <input
                    id="auth-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    className="auth-field__input auth-field__input--password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-field__toggle-eye"
                    onClick={() => setShowNewPassword(prev => !prev)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="auth-confirm-new-password" className="auth-field__label">
                  <Lock size={13} />
                  Confirm New Password
                </label>
                <div className="auth-field__input-wrap">
                  <Lock size={15} className="auth-field__input-icon" />
                  <input
                    id="auth-confirm-new-password"
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    className="auth-field__input auth-field__input--password"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-field__toggle-eye"
                    onClick={() => setShowConfirmNewPassword(prev => !prev)}
                    aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* SUBMIT BUTTON */}
          <button type="submit" className="auth-modal__submit" disabled={loading}>
            {loading ? (
              <>
                <LoaderCircle size={18} className="auth-spinner" />
                <span>
                  {mode === 'login' && 'Signing In...'}
                  {mode === 'register' && 'Creating Account...'}
                  {mode === 'forgot-email' && 'Sending Code...'}
                  {mode === 'forgot-otp' && 'Verifying Code...'}
                  {mode === 'forgot-reset' && 'Changing Password...'}
                </span>
              </>
            ) : (
              <span>
                {mode === 'login' && 'Sign In'}
                {mode === 'register' && 'Create Account'}
                {mode === 'forgot-email' && 'Send Verification Code'}
                {mode === 'forgot-otp' && 'Verify Code'}
                {mode === 'forgot-reset' && 'Change Password'}
              </span>
            )}
          </button>
        </form>

        {/* Toggle Actions */}
        <div className="auth-modal__toggle">
          {mode === 'login' && (
            <button
              type="button"
              className="auth-modal__toggle-btn"
              onClick={() => handleSwitchMode('register')}
            >
              Don't have an account? Create one
            </button>
          )}

          {mode === 'register' && (
            <button
              type="button"
              className="auth-modal__toggle-btn"
              onClick={() => handleSwitchMode('login')}
            >
              Already have an account? Sign in
            </button>
          )}

          {(mode === 'forgot-email' || mode === 'forgot-otp' || mode === 'forgot-reset') && (
            <button
              type="button"
              className="auth-modal__toggle-btn"
              onClick={() => handleSwitchMode('login')}
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
