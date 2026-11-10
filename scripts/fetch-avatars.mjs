import fs from 'node:fs'
import path from 'node:path'

/**
 * Canonical List of 20 Anime Character Avatars
 * Kept strictly identical in IDs, character names, anime series names,
 * and AniList search queries.
 */
const CHARACTERS = [
  { id: 'goku', name: 'Goku', anime: 'Dragon Ball Z', query: 'Goku' },
  { id: 'vegeta', name: 'Vegeta', anime: 'Dragon Ball Z', query: 'Vegeta' },
  { id: 'eren-yeager', name: 'Eren Yeager', anime: 'Attack on Titan', query: 'Eren Yeager' },
  { id: 'naruto-uzumaki', name: 'Naruto Uzumaki', anime: 'Naruto', query: 'Naruto Uzumaki' },
  { id: 'sasuke-uchiha', name: 'Sasuke Uchiha', anime: 'Naruto', query: 'Sasuke Uchiha' },
  { id: 'itachi-uchiha', name: 'Itachi Uchiha', anime: 'Naruto', query: 'Itachi Uchiha' },
  { id: 'minato-namikaze', name: 'Minato Namikaze', anime: 'Naruto', query: 'Minato Namikaze' },
  { id: 'hinata-hyuga', name: 'Hinata Hyuga', anime: 'Naruto', query: 'Hinata Hyuuga' },
  { id: 'sakura-haruno', name: 'Sakura Haruno', anime: 'Naruto', query: 'Sakura Haruno' },
  { id: 'monkey-d-luffy', name: 'Monkey D. Luffy', anime: 'One Piece', query: 'Monkey D. Luffy' },
  { id: 'roronoa-zoro', name: 'Roronoa Zoro', anime: 'One Piece', query: 'Roronoa Zoro' },
  { id: 'ichigo-kurosaki', name: 'Ichigo Kurosaki', anime: 'Bleach', query: 'Ichigo Kurosaki' },
  { id: 'orihime-inoue', name: 'Orihime Inoue', anime: 'Bleach', query: 'Orihime Inoue' },
  { id: 'yasutora-sado', name: 'Yasutora Sado (Chad)', anime: 'Bleach', query: 'Yasutora Sado' },
  { id: 'sung-jinwoo', name: 'Sung Jinwoo', anime: 'Solo Leveling', query: 'Jin-Woo Sung' },
  { id: 'mikey', name: 'Mikey (Manjiro Sano)', anime: 'Tokyo Revengers', query: 'Manjirou Sano' },
  { id: 'takemichi-hanagaki', name: 'Takemichi Hanagaki', anime: 'Tokyo Revengers', query: 'Takemichi Hanagaki' },
  { id: 'tanjiro-kamado', name: 'Tanjiro Kamado', anime: 'Demon Slayer', query: 'Tanjirou Kamado' },
  { id: 'satoru-gojo', name: 'Satoru Gojo', anime: 'Jujutsu Kaisen', query: 'Satoru Gojou' },
  { id: 'asta', name: 'Asta', anime: 'Black Clover', query: 'Asta' },
]

const MIN_IMAGE_BYTES = 1024
const MAX_RETRIES = 5
const BASE_RETRY_DELAY_MS = 2000
const RATE_LIMIT_DELAY_MS = 8000
const USER_AGENT = '7Anime-Avatars-Ingestion/2.0 (production asset generator)'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Validates buffer against known image file signatures (magic numbers).
 * @param {Buffer} buffer
 * @returns {'png' | 'jpg' | 'webp' | null}
 */
function detectImageFormat(buffer) {
  if (!buffer || buffer.length < 16) return null

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png'
  }

  // JPEG / JPG: FF D8 FF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpg'
  }

  // WEBP: RIFF [4 bytes size] WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }

  return null
}

/**
 * Validates whether an existing file is uncorrupted and has a valid image signature.
 * @param {string} filePath
 * @returns {{ valid: boolean, ext: string | null, size: number }}
 */
function inspectExistingFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, ext: null, size: 0 }
    }
    const stat = fs.statSync(filePath)
    if (stat.size < MIN_IMAGE_BYTES) {
      return { valid: false, ext: null, size: stat.size }
    }

    const fd = fs.openSync(filePath, 'r')
    const headerBuffer = Buffer.alloc(16)
    fs.readSync(fd, headerBuffer, 0, 16, 0)
    fs.closeSync(fd)

    const format = detectImageFormat(headerBuffer)
    if (!format) {
      return { valid: false, ext: null, size: stat.size }
    }

    return { valid: true, ext: format, size: stat.size }
  } catch {
    return { valid: false, ext: null, size: 0 }
  }
}

/**
 * Atomically writes content to a target file using a temporary file.
 * @param {string} targetPath
 * @param {Buffer} buffer
 */
function atomicWriteFile(targetPath, buffer) {
  const dir = path.dirname(targetPath)
  fs.mkdirSync(dir, { recursive: true })
  const tmpPath = `${targetPath}.tmp.${Date.now()}`
  fs.writeFileSync(tmpPath, buffer)
  fs.renameSync(tmpPath, targetPath)
}

/**
 * Fetches character image URL from AniList GraphQL with full validation and retry handling.
 * @param {string} query
 * @param {string} charName
 * @returns {Promise<{ imgUrl: string, resolvedName: string }>}
 */
async function fetchCharacterImageUrl(query, charName) {
  let attempt = 0

  while (attempt < MAX_RETRIES) {
    attempt++
    try {
      // Respectful pace between requests to prevent AniList rate limits
      await sleep(1000)

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: `query ($q: String) {
            Character(search: $q) {
              id
              name { full }
              image { large medium }
            }
          }`,
          variables: { q: query },
        }),
      })

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('retry-after')
        const waitMs = retryAfterHeader
          ? Math.max(Number(retryAfterHeader) * 1000, RATE_LIMIT_DELAY_MS)
          : RATE_LIMIT_DELAY_MS * attempt
        console.warn(`[AniList 429] Rate limited on "${charName}". Waiting ${waitMs / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`)
        await sleep(waitMs)
        continue
      }

      if (response.status >= 500) {
        const waitMs = BASE_RETRY_DELAY_MS * attempt
        console.warn(`[AniList ${response.status}] Server error for "${charName}". Waiting ${waitMs / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`)
        await sleep(waitMs)
        continue
      }

      if (!response.ok) {
        throw new Error(`AniList GraphQL returned HTTP ${response.status} (${response.statusText})`)
      }

      let payload
      try {
        payload = await response.json()
      } catch (jsonErr) {
        throw new Error(`Failed to parse AniList response JSON: ${jsonErr.message}`)
      }

      if (payload.errors && Array.isArray(payload.errors) && payload.errors.length > 0) {
        const firstErr = payload.errors[0]
        if (firstErr.status === 429) {
          console.warn(`[AniList 429 in body] Rate limit for "${charName}". Waiting 8s...`)
          await sleep(RATE_LIMIT_DELAY_MS)
          continue
        }
        throw new Error(`AniList returned GraphQL error: ${firstErr.message || JSON.stringify(firstErr)}`)
      }

      const characterData = payload?.data?.Character
      if (!characterData || typeof characterData !== 'object') {
        throw new Error(`AniList returned empty character data for query "${query}"`)
      }

      const resolvedName = characterData?.name?.full || charName
      const imgUrl = characterData?.image?.large || characterData?.image?.medium

      if (!imgUrl || typeof imgUrl !== 'string' || !imgUrl.startsWith('http')) {
        throw new Error(`AniList returned invalid image URL for "${charName}": ${imgUrl}`)
      }

      return { imgUrl, resolvedName }
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        throw err
      }
      const waitMs = BASE_RETRY_DELAY_MS * attempt
      console.warn(`[Retry ${attempt}/${MAX_RETRIES}] Query "${query}" failed: ${err.message}. Retrying in ${waitMs / 1000}s...`)
      await sleep(waitMs)
    }
  }

  throw new Error(`Exceeded maximum retries (${MAX_RETRIES}) querying AniList for "${charName}"`)
}

/**
 * Downloads image buffer with content-type and magic-byte validation.
 * @param {string} imgUrl
 * @param {string} charName
 * @returns {Promise<{ buffer: Buffer, format: string }>}
 */
async function downloadAndValidateImage(imgUrl, charName) {
  let attempt = 0

  while (attempt < MAX_RETRIES) {
    attempt++
    try {
      const response = await fetch(imgUrl, {
        headers: { 'User-Agent': USER_AGENT },
      })

      if (response.status === 429) {
        const waitMs = RATE_LIMIT_DELAY_MS * attempt
        console.warn(`[CDN 429] Rate limited downloading image for "${charName}". Waiting ${waitMs / 1000}s...`)
        await sleep(waitMs)
        continue
      }

      if (response.status >= 500) {
        const waitMs = BASE_RETRY_DELAY_MS * attempt
        console.warn(`[CDN ${response.status}] Server error downloading image for "${charName}". Waiting ${waitMs / 1000}s...`)
        await sleep(waitMs)
        continue
      }

      if (!response.ok) {
        throw new Error(`Image download HTTP ${response.status} (${response.statusText}) from ${imgUrl}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (contentType && !contentType.toLowerCase().startsWith('image/')) {
        throw new Error(`Invalid Content-Type "${contentType}" received from ${imgUrl}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      if (buffer.length < MIN_IMAGE_BYTES) {
        throw new Error(`Downloaded image is truncated or empty (${buffer.length} bytes)`)
      }

      const format = detectImageFormat(buffer)
      if (!format) {
        throw new Error(`Downloaded buffer failed magic byte image validation (unrecognized signature)`)
      }

      return { buffer, format }
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        throw err
      }
      const waitMs = BASE_RETRY_DELAY_MS * attempt
      console.warn(`[Download Retry ${attempt}/${MAX_RETRIES}] for "${charName}": ${err.message}. Retrying in ${waitMs / 1000}s...`)
      await sleep(waitMs)
    }
  }

  throw new Error(`Exceeded maximum retries downloading image for "${charName}"`)
}

async function main() {
  console.log('====================================================')
  console.log(' 7ANIME — HARDENED ANIME AVATAR ASSET GENERATOR')
  console.log(' Target Collection: 20 Official Character Avatars')
  console.log('====================================================\n')

  const publicDir = path.resolve('public/assets/avatars')
  const backendDir = path.resolve('backend/assets/avatars')
  fs.mkdirSync(publicDir, { recursive: true })
  fs.mkdirSync(backendDir, { recursive: true })

  const results = []
  const failedCharacters = []
  const seenIds = new Set()

  for (const char of CHARACTERS) {
    if (seenIds.has(char.id)) {
      console.error(`[CONFIG ERROR] Duplicate character id found in CHARACTERS configuration: ${char.id}`)
      process.exit(1)
    }
    seenIds.add(char.id)

    console.log(`\n▶ Processing [${char.id}] ${char.name} (${char.anime})...`)

    // Check possible image formats on disk to detect existing valid assets
    const candidateFormats = ['png', 'jpg', 'webp']
    let existingFormat = null
    let existingSize = 0

    for (const fmt of candidateFormats) {
      const publicPath = path.join(publicDir, `${char.id}.${fmt}`)
      const backendPath = path.join(backendDir, `${char.id}.${fmt}`)

      const publicCheck = inspectExistingFile(publicPath)
      const backendCheck = inspectExistingFile(backendPath)

      if (publicCheck.valid && backendCheck.valid) {
        existingFormat = fmt
        existingSize = publicCheck.size
        break
      } else if (publicCheck.valid && !backendCheck.valid) {
        console.log(`  Synchronizing ${char.id}.${fmt} from public/ to backend/...`)
        atomicWriteFile(backendPath, fs.readFileSync(publicPath))
        existingFormat = fmt
        existingSize = publicCheck.size
        break
      } else if (!publicCheck.valid && backendCheck.valid) {
        console.log(`  Synchronizing ${char.id}.${fmt} from backend/ to public/...`)
        atomicWriteFile(publicPath, fs.readFileSync(backendPath))
        existingFormat = fmt
        existingSize = backendCheck.size
        break
      }
    }

    if (existingFormat) {
      console.log(`  ✔ Verified existing valid asset: ${char.id}.${existingFormat} (${existingSize.toLocaleString()} bytes)`)
      results.push({
        id: char.id,
        name: char.name,
        anime: char.anime,
        assetPath: `/assets/avatars/${char.id}.${existingFormat}`,
        sizeBytes: existingSize,
      })
      continue
    }

    // Asset missing or corrupted: fetch from AniList and download
    try {
      console.log(`  Fetching metadata from AniList GraphQL for query "${char.query}"...`)
      const { imgUrl, resolvedName } = await fetchCharacterImageUrl(char.query, char.name)
      console.log(`  Found "${resolvedName}" at: ${imgUrl}`)

      console.log(`  Downloading and verifying image content...`)
      const { buffer, format } = await downloadAndValidateImage(imgUrl, char.name)

      const filename = `${char.id}.${format}`
      const targetPublicPath = path.join(publicDir, filename)
      const targetBackendPath = path.join(backendDir, filename)

      atomicWriteFile(targetPublicPath, buffer)
      atomicWriteFile(targetBackendPath, buffer)

      console.log(`  ✔ Successfully saved & synced ${filename} (${buffer.length.toLocaleString()} bytes)`)
      results.push({
        id: char.id,
        name: char.name,
        anime: char.anime,
        assetPath: `/assets/avatars/${filename}`,
        sizeBytes: buffer.length,
      })
    } catch (err) {
      console.error(`  ✖ FAILED to generate avatar for ${char.name} (${char.id}): ${err.message}`)
      failedCharacters.push({
        id: char.id,
        name: char.name,
        anime: char.anime,
        reason: err.message,
      })
    }
  }

  // -------------------------------------------------------------------------
  // FINAL INTEGRITY & CATALOGUE VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n====================================================')
  console.log(' EXECUTION SUMMARY')
  console.log('====================================================')

  if (failedCharacters.length > 0) {
    console.error(`\n❌ ERROR: ${failedCharacters.length} / ${CHARACTERS.length} character avatars failed to process:`)
    for (const f of failedCharacters) {
      console.error(`   - ${f.name} (${f.id}) [${f.anime}]: ${f.reason}`)
    }
    console.error('\nCatalogue file was NOT updated. Exiting with status 1.')
    process.exit(1)
  }

  if (results.length !== CHARACTERS.length) {
    console.error(`\n❌ ERROR: Expected exactly ${CHARACTERS.length} entries, but produced ${results.length}.`)
    console.error('Catalogue file was NOT updated. Exiting with status 1.')
    process.exit(1)
  }

  // Ensure catalog is ordered exactly as in CHARACTERS
  const canonicalResults = CHARACTERS.map((char) => {
    const found = results.find((r) => r.id === char.id)
    if (!found) {
      console.error(`\n❌ ERROR: Missing result entry for "${char.id}".`)
      process.exit(1)
    }
    return found
  })

  const catalogPath = path.resolve('src/data/animeAvatars.json')
  fs.writeFileSync(catalogPath, JSON.stringify(canonicalResults, null, 2) + '\n')
  console.log(`✔ Generated catalog successfully: ${catalogPath}`)
  console.log(`✔ All ${canonicalResults.length} character avatars verified in both public/ and backend/ directories.`)
  console.log('====================================================\n')
}

main().catch((fatalErr) => {
  console.error('\n[FATAL ERROR]', fatalErr)
  process.exit(1)
})
