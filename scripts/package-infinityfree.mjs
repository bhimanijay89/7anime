#!/usr/bin/env node

/**
 * 7anime — InfinityFree Deployment Packager
 *
 * This script creates a production-ready static hosting package for InfinityFree (https://7anime.ct.ws).
 * It copies the build artifacts from `dist/` into `deployment/infinityfree/`, generates an
 * Apache `.htaccess` file tailored for SPA client-side routing, correct MIME types, and security headers,
 * and validates the resulting package integrity.
 *
 * Output target: deployment/infinityfree/
 * Ready for direct upload to: InfinityFree `htdocs/`
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const DIST_DIR = path.resolve(ROOT_DIR, 'dist')
const DEPLOY_DIR = path.resolve(ROOT_DIR, 'deployment', 'infinityfree')

const APACHE_HTACCESS_CONTENT = `# ==============================================================================
# 7anime — InfinityFree Apache Configuration (.htaccess)
# Domain: https://7anime.ct.ws
# Generated automatically by scripts/package-infinityfree.mjs
# DO NOT EDIT DIRECTLY IN REPOSITORY ROOT — EDIT THE PACKAGER SCRIPT
# ==============================================================================

# 1. Prevent Directory Indexing
Options -Indexes

# 2. Set Default Character Set
AddDefaultCharset UTF-8

# 3. MIME Types Configuration
# Ensures correct MIME types for modern ES modules, styles, fonts, and media
<IfModule mod_mime.c>
  AddType application/javascript .js .mjs
  AddType text/css .css
  AddType image/svg+xml .svg
  AddType application/json .json
  AddType image/webp .webp
  AddType font/woff .woff
  AddType font/woff2 .woff2
  AddType video/mp4 .mp4
</IfModule>

# 4. HTTP Headers & Caching Policies
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set Permissions-Policy "camera=(), microphone=(), geolocation=()"

  # Long-term immutable caching for hashed production assets
  <FilesMatch "\\.(js|mjs|css|webp|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
    Header set Cache-Control "max-age=31536000, public, immutable"
  </FilesMatch>

  # Revalidation headers for HTML entry points to ensure instant updates
  <FilesMatch "\\.(html|htm)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>

# 5. Client-Side SPA Rewrite Rules (History API Fallback)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Bypass rewriting if requesting index.html directly
  RewriteRule ^index\\.html$ - [L]

  # Serve existing physical files directly without rewriting
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  # Serve existing physical directories directly
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Fallback: Rewrite all other application routes to index.html
  RewriteRule ^ index.html [L]
</IfModule>

# 6. Fallback 404 Error Document (Directs to SPA entry point)
ErrorDocument 404 /index.html
`

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function cleanDeploymentDir(targetDir) {
  await fs.mkdir(targetDir, { recursive: true })
  const entries = await fs.readdir(targetDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.gitkeep') continue
    const fullPath = path.join(targetDir, entry.name)
    await fs.rm(fullPath, { recursive: true, force: true })
  }
}

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

async function collectPackageStats(targetDir) {
  let fileCount = 0
  let totalBytes = 0
  const largeFiles = []

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else {
        fileCount++
        const stat = await fs.stat(fullPath)
        totalBytes += stat.size
        // InfinityFree free plan imposes a 10MB limit per individual file
        if (stat.size > 10 * 1024 * 1024) {
          largeFiles.push({
            relative: path.relative(targetDir, fullPath),
            sizeMB: (stat.size / (1024 * 1024)).toFixed(2),
          })
        }
      }
    }
  }

  await walk(targetDir)
  return { fileCount, totalBytes, largeFiles }
}

async function main() {
  console.log('====================================================')
  console.log(' 7anime — InfinityFree Hosting Package Generator')
  console.log(' Target Domain: https://7anime.ct.ws')
  console.log('====================================================\n')

  // Step 1: Verify or trigger production build
  const shouldBuild = process.argv.includes('--build') || !(await pathExists(DIST_DIR))
  if (shouldBuild) {
    console.log('[1/4] Running production build (`npm run build`)...')
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' })
  } else {
    console.log('[1/4] Using existing `dist/` directory.')
  }

  // Step 2: Validate dist directory contents
  const distIndexPath = path.join(DIST_DIR, 'index.html')
  const distAssetsPath = path.join(DIST_DIR, 'assets')
  if (!(await pathExists(distIndexPath))) {
    console.error('Error: dist/index.html not found! Please run `npm run build` first.')
    process.exit(1)
  }
  if (!(await pathExists(distAssetsPath))) {
    console.error('Error: dist/assets directory not found!')
    process.exit(1)
  }
  console.log('[2/4] Dist directory validated successfully.')

  // Step 3: Clean and copy build files to deployment/infinityfree/
  console.log(`[3/4] Packaging files into: ${path.relative(ROOT_DIR, DEPLOY_DIR)}...`)
  await cleanDeploymentDir(DEPLOY_DIR)
  await copyDirectory(DIST_DIR, DEPLOY_DIR)

  // Step 4: Write customized .htaccess for InfinityFree
  const htaccessPath = path.join(DEPLOY_DIR, '.htaccess')
  await fs.writeFile(htaccessPath, APACHE_HTACCESS_CONTENT, 'utf8')
  console.log('[4/4] Generated InfinityFree-specific .htaccess.')

  // Verification & Package Summary
  const stats = await collectPackageStats(DEPLOY_DIR)
  const totalMB = (stats.totalBytes / (1024 * 1024)).toFixed(2)

  console.log('\n----------------------------------------------------')
  console.log(' InfinityFree Package Ready')
  console.log('----------------------------------------------------')
  console.log(` Output Folder:       ${DEPLOY_DIR}`)
  console.log(` Total Files:         ${stats.fileCount}`)
  console.log(` Package Total Size:  ${totalMB} MB`)
  console.log(` Entrypoint (.html):  ${path.join(DEPLOY_DIR, 'index.html')}`)
  console.log(` Routing Config:      ${htaccessPath}`)

  if (stats.largeFiles.length > 0) {
    console.log('\n[NOTICE] The following file(s) exceed 10 MB:')
    for (const file of stats.largeFiles) {
      console.log(`  - ${file.relative} (${file.sizeMB} MB)`)
    }
    console.log('Note: InfinityFree free accounts limit individual uploads to 10 MB.')
  }

  console.log('\nUpload Instructions:')
  console.log('1. Open your FTP client (FileZilla, WinSCP) or InfinityFree Monsta File Manager.')
  console.log('2. Navigate into the `htdocs/` folder of your website account (https://7anime.ct.ws).')
  console.log('3. Upload the CONTENTS of `deployment/infinityfree/` directly into `htdocs/`.')
  console.log('   (index.html, .htaccess, and assets/ must sit directly in htdocs/).')
  console.log('====================================================\n')
}

main().catch((err) => {
  console.error('\nPackaging failed with error:\n', err)
  process.exit(1)
})
