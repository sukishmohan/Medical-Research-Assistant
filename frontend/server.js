import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

console.log('🚀 Starting server...')
console.log('📂 __dirname:', __dirname)
console.log('🌐 PORT:', PORT)

// Serve static files
const distPath = path.join(__dirname, 'dist')
console.log('📁 Serving from:', distPath)
app.use(express.static(distPath))

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Frontend is running' })
})

// SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err)
      res.status(500).send('Frontend error: index.html not found')
    }
  })
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Server started successfully on port', PORT)
})

server.on('error', (err) => {
  console.error('❌ Server error:', err)
  process.exit(1)
})


