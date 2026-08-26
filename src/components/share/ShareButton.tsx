import { Share2 } from 'lucide-react'
import type { ShareData } from '../../types/domain'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'

export function ShareButton({ data }: { data: ShareData }) {
  const { notify } = useToast()

  const copyToClipboard = async (url: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        notify('Link copied to clipboard!', 'success')
      }
    } catch (err) {
      console.error('Failed to copy link to clipboard:', err)
    }
  }

  const handleShare = async () => {
    const shareUrl = data.url || (typeof window !== 'undefined' ? window.location.href : 'https://7anime.app')
    const shareTitle = data.title || '7anime'

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl,
          text: data.description,
        })
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        await copyToClipboard(shareUrl)
      }
    } else {
      await copyToClipboard(shareUrl)
    }
  }

  return (
    <Button variant="glass" onClick={handleShare}>
      <Share2 size={16} /> Share
    </Button>
  )
}

