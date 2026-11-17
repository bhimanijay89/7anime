console.log('Testing import of server.js...')
try {
  await import('../backend/dist/server.js')
  console.log('Imported successfully!')
} catch (e) {
  console.error('Import error:', e)
}
