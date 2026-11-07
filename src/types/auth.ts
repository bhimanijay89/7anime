export interface AuthUser {
  id: string
  email: string
  username: string
  displayName?: string | null
  bio?: string | null
  avatar?: string | null
  role?: string
}
