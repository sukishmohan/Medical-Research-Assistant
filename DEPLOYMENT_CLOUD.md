# ☁️ Cloud Deployment Guide

Deploy your Medical Research Assistant to production using **Vercel** (Frontend) + **Railway** (Backend) + **Groq API** (LLM).

---

## 🚀 Architecture

```
┌─────────────────────┐
│  Vercel (Frontend)  │  React 18 + Vite
├─────────────────────┤
│   https://...       │
│  vercel.app         │
└──────────┬──────────┘
           │ API Calls
           ▼
┌─────────────────────┐
│ Railway (Backend)   │  Node.js + Express
├─────────────────────┤
│   https://...       │
│  railway.app        │
└──────────┬──────────┘
           │ API Calls
           ▼
┌─────────────────────┐
│  Groq LLM API       │  Llama 3.1
├─────────────────────┤
│ api.groq.com        │
└─────────────────────┘

Database: Railway PostgreSQL / MongoDB Atlas
Cache: Railway Redis
```

---

## 📋 Prerequisites

1. **GitHub Account** - For connecting to deployment platforms
2. **Groq API Key** - Get free at https://console.groq.com
3. **Git** - For pushing code to GitHub
4. **MongoDB Atlas Account** (optional, but recommended)

---

## 🔑 Step 1: Set Up Groq API Key

### Get Your Free API Key

1. Visit: https://console.groq.com
2. Sign up or login with email
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy and save your key securely
6. You get **10,000 free calls/day** - more than enough for hackathon!

### Verify Your Key Works

```bash
# Test the API locally
curl https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer gsk_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-70b-versatile",
    "messages": [{"role": "user", "content": "Say OK"}],
    "max_tokens": 10
  }'
```

---

## 📦 Step 2: Push Code to GitHub

```bash
# Initialize git repo
cd hackathon
git init
git add .
git commit -m "Initial commit: Medical Research Assistant"

# Create new repo on GitHub (https://github.com/new)
# Then:
git remote add origin https://github.com/YOUR_USERNAME/hackathon.git
git branch -M main
git push -u origin main
```

---

## 🎯 Step 3: Deploy Backend to Railway

### Option A: Railway + MongoDB Atlas (Recommended)

1. **Sign Up**: https://railway.app
2. **Connect GitHub**: Click "GitHub" → Authorize
3. **Create New Project** → Select "Provision PostgreSQL"
4. **Configure Backend Service**:
   - Detect: Railways usually auto-detects `package.json`
   - Add Environment Variables:
     - `NODE_ENV=production`
     - `PORT=3000`
     - `GROQ_API_KEY=gsk_YOUR_KEY_HERE`
     - `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medical_research`
     - `REDIS_URL=redis://localhost:6379` (if using Railway Redis)
     - `FRONTEND_URL=https://your-app.vercel.app`
5. **Deploy**: Railway auto-deploys on push

### Option B: Railway + MongoDB on Railway

1. Sign up for Railway
2. Create new project
3. Add these services:
   - **Node.js Backend**: Your repo
   - **PostgreSQL**: For user data
   - **Redis**: For caching

4. Link services together in Railway dashboard
5. Set environment variables

### Get Your API URL

Once deployed, Railway shows your public URL:
```
https://medresearch-api-production.up.railway.app
```

Save this - you'll need it for the frontend!

---

## 🎨 Step 4: Deploy Frontend to Vercel

### Option A: Vercel GitHub Integration (Easiest)

1. **Sign Up**: https://vercel.com
2. **Import Project**: Click "Import Project" → Select GitHub repo
3. **Configure**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `frontend/dist`
   - Root Directory: `frontend`
4. **Environment Variables**:
   - `VITE_API_URL=https://your-api-url.railway.app` (from Step 3)
   - `VITE_GROQ_API_KEY=gsk_YOUR_KEY_HERE` (optional, if frontend needs it)
5. **Deploy**: Vercel auto-deploys on push

### Get Your Frontend URL

Once deployed:
```
https://your-app.vercel.app
```

Update backend's `FRONTEND_URL` environment variable if needed.

---

## 🧪 Step 5: Verify Deployment

### Check Backend Health

```bash
curl https://your-api-url.railway.app/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Check LLM Connection

```bash
curl https://your-api-url.railway.app/api/llm/health
# Should return: {"healthy":true,"model":"llama-3.1-70b-versatile","api":"groq"}
```

### Test Search Endpoint

```bash
curl -X POST https://your-api-url.railway.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Latest treatments for NSCLC"}'
```

### Access Frontend

Open: https://your-app.vercel.app

---

## 🔄 Continuous Deployment

Both Vercel and Railway auto-deploy on every push:

```bash
# Make changes locally
git add .
git commit -m "Update feature X"
git push origin main

# Automatically deployed! ✅
```

---

## 📊 Monitoring

### Railway Dashboard
- View logs: `railway logs`
- CPU/Memory usage
- Deployment history

### Vercel Dashboard
- View builds
- See analytics
- Monitor performance

### Groq API Usage
- Check at: https://console.groq.com
- Free tier: 10,000 calls/day
- Track remaining quota

---

## 💾 Database Setup

### Option 1: MongoDB Atlas (Free)

1. Sign up: https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string
4. Add to Railway environment:
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/medical_research
   ```

### Option 2: Railway PostgreSQL

1. Add PostgreSQL in Railway dashboard
2. Railway auto-sets: `DATABASE_URL`
3. Backend auto-connects

---

## 🚨 Troubleshooting

### Backend won't start
```bash
# Check logs
railway logs -f

# Common issues:
# - GROQ_API_KEY not set
# - MONGODB_URI invalid
# - PORT already in use
```

### Frontend not connecting to API
```javascript
// Check frontend .env.local
VITE_API_URL=https://your-api-url.railway.app

// Or set in Vercel dashboard
```

### Groq API returning 401
```bash
# Verify API key
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer gsk_YOUR_KEY_HERE"

# Get new key if expired: https://console.groq.com
```

### Slow responses
- Check Railway CPU usage (usually need upgrade)
- Cache might not be working
- Groq API rate limit (10,000/day)

---

## 🎯 Cost Breakdown

| Service | Free Tier | Cost |
|---------|-----------|------|
| **Vercel** | 100GB bandwidth/month | ✅ Free |
| **Railway** | $5/month credit | ~$2/month |
| **Groq API** | 10,000 calls/day | ✅ Free |
| **MongoDB Atlas** | 512MB storage | ✅ Free |
| **Total** | | ~$2/month |

---

## 📝 Environment Variables Checklist

### Railway Backend
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `GROQ_API_KEY=gsk_...`
- [ ] `MONGODB_URI=mongodb+srv://...`
- [ ] `FRONTEND_URL=https://your-app.vercel.app`
- [ ] `REDIS_URL=...`

### Vercel Frontend
- [ ] `VITE_API_URL=https://your-api.railway.app`
- [ ] (Optional) `VITE_GROQ_API_KEY=gsk_...`

---

## 🎬 Demo Submission

For hackathon judges, provide:

1. **Live Frontend Link**: https://your-app.vercel.app
2. **API Documentation**: https://your-api.railway.app/docs (if available)
3. **GitHub Repo**: https://github.com/username/hackathon
4. **Video Demo**: Loom or YouTube showing:
   - Searching for medical research
   - Papers being retrieved
   - Response being generated
   - System latency
5. **Brief Summary**:
   ```
   AI-Powered Medical Research Assistant
   - Frontend: Vercel (React 18 + Vite)
   - Backend: Railway (Node.js + Express)
   - LLM: Groq API (Llama 3.1)
   - Database: MongoDB Atlas
   - Live: https://your-app.vercel.app
   ```

---

## 🏆 Hackathon Submission Template

```
Hi judges,

I'm submitting "Medical Research Assistant", an AI system for intelligent 
research paper retrieval and synthesis.

🔗 Live Demo: https://your-app.vercel.app
🔗 GitHub: https://github.com/username/hackathon
🎥 Video: https://loom.com/share/...

Features:
✅ Multi-source retrieval (OpenAlex, PubMed, ClinicalTrials)
✅ ML-based ranking (relevance, recency, authority, clinical significance)
✅ Groq Llama 3.1 for synthesis
✅ Context-aware conversation memory
✅ Hallucination prevention with fact-checking
✅ Trust metrics and transparency
✅ <2 second response time

Tech Stack:
- Frontend: React 18 + Vite → Vercel
- Backend: Node.js + Express → Railway
- LLM: Groq API (free, 10K calls/day)
- Database: MongoDB Atlas (free tier)

Status: Production-ready, fully deployed
```

---

## ✅ Deployment Checklist

- [ ] Groq API key obtained
- [ ] Code pushed to GitHub
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set correctly
- [ ] Backend health check passing
- [ ] Frontend can reach backend API
- [ ] Test search query working
- [ ] Demo video created
- [ ] Submission form filled with links

---

**You're ready to deploy! 🚀**
