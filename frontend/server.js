import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Check if dist exists
const distPath = path.join(__dirname, 'dist')
console.log('📁 Checking dist folder:', distPath)
console.log('📁 Dist exists:', fs.existsSync(distPath))

// Serve static files from dist folder
app.use(express.static(distPath, { 
  maxAge: '1d',
  etag: false 
}))

// Handle SPA routing - serve index.html for all routes
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).send('index.html not found')
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Frontend running on http://0.0.0.0:${PORT}`)
  console.log(`🔗 Backend URL: ${process.env.VITE_API_URL || 'not configured'}`)
  console.log(`📁 Serving from: ${distPath}`)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

