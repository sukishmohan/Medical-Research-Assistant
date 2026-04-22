import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Serve static files from dist folder
app.use(express.static(path.join(__dirname, 'dist')))

// Handle SPA routing - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`✅ Frontend running on port ${PORT}`)
  console.log(`Backend URL: ${process.env.VITE_API_URL || 'http://localhost:8080'}`)
})
