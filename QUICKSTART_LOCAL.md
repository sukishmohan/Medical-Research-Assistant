# 🚀 Quick Start: Local Development with Groq

Get the system running locally in 5 minutes with **Groq API** instead of Ollama.

---

## ✅ Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- MongoDB running locally OR MongoDB Atlas account ([Atlas](https://www.mongodb.com/cloud/atlas))
- Redis running locally OR Redis Cloud ([Redis Cloud](https://redis.com/try-free/))
- **Groq API Key** ([Get free](https://console.groq.com))

---

## 📝 Step 1: Set Environment Variables

Create `.env` in project root:

```bash
# .env (copy from .env.example and fill in)
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/medical_research_assistant
REDIS_HOST=localhost
REDIS_PORT=6379

# External APIs
PUBMED_API_KEY=your_pubmed_key_optional
OPENALEX_EMAIL=your_email@example.com

# 🔑 Groq API Key - Get free at https://console.groq.com
GROQ_API_KEY=gsk_YOUR_KEY_HERE

# Server
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

### Get Your Groq Key:
1. Visit: https://console.groq.com
2. Sign up with email
3. Copy your API key
4. Paste into `.env`

---

## 🍃 Step 2: Start MongoDB (if local)

```bash
# Option A: Using MongoDB Community (if installed)
mongod

# Option B: Using Docker (if you have Docker)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Option C: Use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env with Atlas connection string
```

---

## 💾 Step 3: Start Redis (if local)

```bash
# Option A: Using Redis (if installed)
redis-server

# Option B: Using Docker
docker run -d -p 6379:6379 --name redis redis:latest

# Option C: Use Redis Cloud
# Update REDIS_URL in .env with cloud connection string
```

---

## ⚙️ Step 4: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

---

## 🎯 Step 5: Start Backend

```bash
cd backend
npm run dev
```

Expected output:
```
✓ Server running on http://localhost:3000
✓ MongoDB connected
✓ Redis connected
✓ Groq LLM service ready
```

Test it:
```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

---

## 🎨 Step 6: Start Frontend

```bash
# In another terminal
cd frontend
npm run dev
```

Expected output:
```
  VITE v4.5.0  ready in 245 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Open: http://localhost:5173

---

## 🧪 Step 7: Test the System

### Via Web UI
1. Go to http://localhost:5173
2. Type: "Latest treatments for lung cancer"
3. Watch papers load and response generate!

### Via API
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "NSCLC treatment options",
    "userId": "test-user"
  }'
```

Expected response:
```json
{
  "success": true,
  "response": {
    "conditionOverview": "...",
    "researchInsights": [
      {
        "title": "...",
        "authors": [...],
        "abstract": "...",
        "score": 0.92
      }
    ],
    "trustMetrics": {
      "overallTrustScore": 0.94,
      "sourceCredibility": 0.96
    }
  },
  "metadata": {
    "totalTimeMs": 1523,
    "retrievalStats": {
      "openAlexPapers": 34,
      "pubmedPapers": 28,
      "trials": 12
    }
  }
}
```

---

## 🐛 Troubleshooting

### Error: GROQ_API_KEY not set
```bash
# Check your .env file has the key
echo $GROQ_API_KEY

# If empty, add it:
export GROQ_API_KEY=gsk_YOUR_KEY_HERE

# Restart backend
```

### Error: MongoDB connection failed
```bash
# Check MongoDB is running
mongod --version

# Or use MongoDB Atlas:
# 1. Create free account at https://www.mongodb.com/cloud/atlas
# 2. Get connection string
# 3. Update MONGODB_URI in .env
```

### Error: Redis connection failed
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Or use Redis Cloud:
# Update REDIS_URL in .env
```

### Error: LLM returning 401/403
```bash
# Verify API key is correct
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer gsk_YOUR_KEY_HERE"

# If fails:
# 1. Check key at https://console.groq.com
# 2. Generate new key if needed
# 3. Update .env
# 4. Restart backend
```

### Frontend can't reach backend API
```bash
# Check CORS is enabled in backend .env
CORS_ORIGIN=http://localhost:5173

# Or update frontend .env
VITE_API_URL=http://localhost:3000

# Restart both services
```

---

## 📊 What You Get

```
┌─────────────────────────────────────────┐
│  Medical Research Assistant - Local     │
├─────────────────────────────────────────┤
│  Frontend: http://localhost:5173        │
│  API: http://localhost:3000             │
│  MongoDB: localhost:27017               │
│  Redis: localhost:6379                  │
│  LLM: Groq API (llama-3.1-70b-versatile)│
└─────────────────────────────────────────┘
```

---

## 🚀 Next Steps

### Test Everything
1. Search for a medical condition
2. Verify papers are retrieved
3. Check response is grounded
4. Look at trust metrics

### Customize
- Update system prompt in `services/LLMService.js`
- Adjust ranking weights in `services/RankingService.js`
- Modify UI in `frontend/src/components.jsx`

### Deploy
When ready, follow [DEPLOYMENT_CLOUD.md](./DEPLOYMENT_CLOUD.md) to:
- Deploy frontend to Vercel
- Deploy backend to Railway
- Go live! 🎉

---

## 📝 Common Commands

```bash
# Backend
cd backend
npm run dev          # Start with hot reload
npm run build        # Build for production
npm test             # Run tests

# Frontend
cd frontend
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build

# System
git add .
git commit -m "..."
git push             # Auto-deploys to Vercel + Railway
```

---

## ✅ Checklist

- [ ] Node.js 18+ installed
- [ ] MongoDB running or Atlas URI set
- [ ] Redis running or Cloud URI set
- [ ] Groq API key obtained
- [ ] `.env` file created with variables
- [ ] Backend installed (`npm install`)
- [ ] Frontend installed (`npm install`)
- [ ] Backend running (`npm run dev`)
- [ ] Frontend running (`npm run dev`)
- [ ] Can access http://localhost:5173
- [ ] Can search and get results
- [ ] API returns valid response

---

**Everything ready? Time to demo! 🎬**
