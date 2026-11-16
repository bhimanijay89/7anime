import { Router, type Request, type Response } from 'express'

export const animetvplusRouter = Router()

const CANONICAL_ORIGIN = 'https://embed.animetvplus.site'

/**
 * Validates that an embed path is a safe relative path belonging to AnimeTVPlus.
 * Rejects external origins, protocol-relative slashes (//), path traversal (..), backslashes, etc.
 */
export function isSafeEmbedPath(embedPath: unknown): embedPath is string {
  if (typeof embedPath !== 'string' || !embedPath.trim()) {
    return false
  }

  const trimmed = embedPath.trim()

  if (!trimmed.startsWith('/embed/') || trimmed.startsWith('//')) {
    return false
  }

  if (
    trimmed.includes('\\') ||
    trimmed.includes('%2f') ||
    trimmed.includes('%2F') ||
    trimmed.includes('..')
  ) {
    return false
  }

  const safePathRegex = /^\/embed\/[a-zA-Z0-9_\-\.\/]+(?:\?[a-zA-Z0-9_=&-]+)?$/
  return safePathRegex.test(trimmed)
}

/**
 * GET /api/animetvplus/resolve
 * Queries AnimeTVPlus AniList-primary resolve API server-side, eliminating
 * client-side CORS failures and validating the response against strict JSON schema.
 */
animetvplusRouter.get('/resolve', async (req: Request, res: Response) => {
  const anilistParam = req.query.anilist
  const epParam = req.query.ep

  const parsedAniId = Number(anilistParam)
  if (!Number.isInteger(parsedAniId) || parsedAniId <= 0) {
    res.status(400).json({
      ok: false,
      error: 'invalid_anilist_id',
      message: 'A valid positive AniList ID is required for Server 1 (AnimeTVPlus).',
    })
    return
  }

  const parsedEp = Math.max(1, Math.floor(Number(epParam) || 1))
  const targetUrl = `${CANONICAL_ORIGIN}/api/v1/resolve?anilist=${parsedAniId}&ep=${parsedEp}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': '7Anime-Player/1.0',
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    // Handle non-200 HTTP responses
    if (!response.ok) {
      let body: any = null
      try {
        body = await response.json()
      } catch {}

      if (response.status === 404) {
        res.status(200).json({
          ok: false,
          error: body?.error || 'no_episode',
          title: body?.title,
          episode: parsedEp,
          available: Array.isArray(body?.available) ? body.available : undefined,
          message:
            body?.message ||
            `Episode ${parsedEp} is not available on Server 1 (AnimeTVPlus). Please switch to Server 2 or Server 3.`,
        })
        return
      }

      res.status(200).json({
        ok: false,
        error: `http_${response.status}`,
        message: `Server 1 (AnimeTVPlus) resolver returned HTTP ${response.status}.`,
      })
      return
    }

    const contentType = response.headers.get('content-type') || ''

    // Strict validation: reject HTML responses (such as Nginx SPA fallback shells)
    if (contentType.includes('text/html')) {
      res.status(200).json({
        ok: false,
        error: 'html_response',
        message: 'AnimeTVPlus returned HTML instead of JSON. API response could not be validated.',
      })
      return
    }

    if (!contentType.includes('application/json')) {
      res.status(200).json({
        ok: false,
        error: 'non_json_response',
        message: 'AnimeTVPlus returned an unexpected response format. Expected JSON.',
      })
      return
    }

    let data: any
    try {
      data = await response.json()
    } catch {
      res.status(200).json({
        ok: false,
        error: 'malformed_json',
        message: 'Server 1 (AnimeTVPlus) returned malformed JSON.',
      })
      return
    }

    if (!data || typeof data !== 'object') {
      res.status(200).json({
        ok: false,
        error: 'malformed_response',
        message: 'Server 1 (AnimeTVPlus) returned an empty or invalid payload.',
      })
      return
    }

    if (data.ok !== true) {
      res.status(200).json({
        ok: false,
        error: data.error || 'unavailable',
        title: data.title,
        episode: data.episode || parsedEp,
        available: Array.isArray(data.available) ? data.available : undefined,
        message:
          data.error === 'no_episode'
            ? `Episode ${parsedEp} is not yet available on Server 1 (AnimeTVPlus). Please switch to Server 2 or Server 3.`
            : `Server 1 (AnimeTVPlus) is currently unavailable: ${data.error || 'Unknown error'}.`,
      })
      return
    }

    if (!isSafeEmbedPath(data.embed)) {
      res.status(200).json({
        ok: false,
        error: 'untrusted_embed_path',
        message: 'Server 1 (AnimeTVPlus) returned an invalid or untrusted embed path.',
      })
      return
    }

    res.status(200).json({
      ok: true,
      title: data.title,
      mal: typeof data.mal === 'number' ? data.mal : undefined,
      anilist: typeof data.anilist === 'number' ? data.anilist : parsedAniId,
      episode: typeof data.episode === 'number' ? data.episode : parsedEp,
      embed: data.embed,
      fullUrl: `${CANONICAL_ORIGIN}${data.embed}`,
    })
  } catch (err: any) {
    if (err.name === 'AbortError') {
      res.status(200).json({
        ok: false,
        error: 'timeout',
        message: 'Connection timed out while resolving Server 1 (AnimeTVPlus). Please try again or switch to another server.',
      })
      return
    }

    res.status(200).json({
      ok: false,
      error: 'provider_unavailable',
      message: 'Provider API unavailable. Unable to reach Server 1 (AnimeTVPlus). Please switch to Server 2 or Server 3.',
    })
  }
})
