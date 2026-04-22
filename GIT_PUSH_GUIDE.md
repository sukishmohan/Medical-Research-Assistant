# 📤 Git Push Guide - Deploy Your Code

Complete step-by-step guide to push your Medical Research Assistant to GitHub and deploy to Railway.

---

## ✅ Current Status

```
✅ Repository created on GitHub
✅ Railway account signed in
✅ node_modules cleaned (108MB → 371KB)
✅ File structure organized
✅ .gitignore configured
✅ package.json ready
```

Now let's push your code!

---

## 🚀 Step 1: Initialize Git (If Needed)

```powershell
cd c:\Users\sukis\Downloads\hackathon

# Check if git is initialized
git status

# If not initialized, run:
git init
```

---

## 📝 Step 2: Configure Git (First Time Only)

```powershell
# Set your name and email (required for commits)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify
git config --global user.name
git config --global user.email
```

---

## 🔗 Step 3: Add Remote Repository

Replace `YOUR_USERNAME` with your GitHub username!

```powershell
# Add GitHub remote (only if not already added)
git remote add origin https://github.com/YOUR_USERNAME/hackathon.git

# Verify it's added
git remote -v
# Should show:
# origin  https://github.com/YOUR_USERNAME/hackathon.git (fetch)
# origin  https://github.com/YOUR_USERNAME/hackathon.git (push)
```

If you get an error saying "remote origin already exists", run:
```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/hackathon.git
```

---

## 📦 Step 4: Stage All Files

```powershell
# Check what will be added
git status

# Add all files (respects .gitignore)
git add .

# Verify what's staged
git status
# Should show many files in green (staged)
# node_modules should NOT appear (ignored by .gitignore)
```

---

## 💾 Step 5: Create First Commit

```powershell
# Create commit with descriptive message
git commit -m "Medical Research Assistant - Hackathon Submission

- Multi-source retrieval (OpenAlex, PubMed, ClinicalTrials)
- ML-based ranking with 4-factor scoring
- Groq API integration for Llama 3.1
- Context-aware conversation memory
- Hallucination prevention layer
- Production-ready deployment setup"

# Verify commit
git log --oneline
```

---

## 🚀 Step 6: Push to GitHub

```powershell
# First push to main branch
git branch -M main
git push -u origin main

# Subsequent pushes (just use this)
git push

# Verify on GitHub
# Go to: https://github.com/YOUR_USERNAME/hackathon
# You should see all your files!
```

---

## ⚡ Step 7: Railway Auto-Deployment

Once code is on GitHub, Railway will auto-deploy!

### For Backend:
1. Open Railway dashboard: https://railway.app
2. Go to your project
3. Click "Settings" → "GitHub Integration"
4. Connect your GitHub repository
5. Railway auto-deploys on every `git push` ✅

### For Frontend (on Vercel):
1. Open Vercel dashboard: https://vercel.com
2. Import your GitHub repository
3. Vercel auto-deploys on every `git push` ✅

---

## 📊 File Structure Being Committed

```
hackathon/
├── backend/
│   ├── index.js                (main server)
│   ├── package.json            (dependencies)
│   └── routes/
│       ├── search.js
│       ├── conversations.js
│       └── users.js
│
├── frontend/
│   ├── package.json            (dependencies)
│   ├── src/
│   │   ├── App.jsx
│   │   └── components.jsx
│   └── vercel.json
│
├── services/
│   ├── LLMService.js           (Groq API)
│   ├── QueryUnderstandingService.js
│   ├── RankingService.js
│   └── RetrievalService.js
│
├── docs/
│   ├── 01_SYSTEM_ARCHITECTURE.md
│   ├── 02_RETRIEVAL_STRATEGY.md
│   ├── 03_LLM_RANKING.md
│   ├── 04_PERSONALIZATION_LAYER.md
│   ├── 05_PERFORMANCE_SCALABILITY.md
│   ├── 06_DEMO_WALKTHROUGH.md
│   ├── 07_WINNING_EDGE_UI_UX.md
│   └── 08_DEPLOYMENT_PRODUCTION.md
│
├── .gitignore                  (what NOT to commit)
├── .env.example                (template for env vars)
├── package.json                (root package)
├── README.md                   (main overview)
├── QUICKSTART_LOCAL.md         (local setup guide)
├── DEPLOYMENT_CLOUD.md         (cloud deployment)
├── GROQ_API_GUIDE.md          (Groq API guide)
├── UPDATE_SUMMARY.md           (what changed)
├── docker-compose.yml          (optional local)
└── Dockerfile                  (optional local)
```

---

## ✅ What Gets Ignored (Not Committed)

```
.gitignore prevents these from being committed:

❌ node_modules/               (reinstalled during deployment)
❌ dist/                       (built during deployment)
❌ build/                      (built during deployment)
❌ .env                        (secrets, use .env.example)
❌ .vscode/                    (your IDE settings)
❌ .idea/                      (your IDE settings)
❌ logs/                       (runtime logs)
❌ *.log                       (log files)
❌ .cache/                     (cache files)
```

---

## 🔐 Environment Variables - Important!

### DO NOT commit .env
```
.env contains:
- GROQ_API_KEY (secret!)
- MONGODB_URI (secret!)
- Other sensitive data
```

### Use .env.example instead
```
.env.example is committed
It shows the structure but not actual values
Users copy it: cp .env.example .env
Then fill in their own values
```

### For Railway/Vercel deployment:
1. Set variables in platform dashboard
2. NOT in .env file
3. They're injected at runtime

---

## 📋 Quick Command Reference

```powershell
# Check status
git status

# Add all changes
git add .

# Commit
git commit -m "your message"

# Push to GitHub
git push

# View commit history
git log --oneline

# View remote
git remote -v

# Undo last commit (before push)
git reset --soft HEAD~1

# Undo last commit (after push, be careful!)
git revert HEAD
```

---

## 🐛 Troubleshooting

### Error: "fatal: not a git repository"
```powershell
cd c:\Users\sukis\Downloads\hackathon
git init
```

### Error: "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/hackathon.git
```

### Error: "authentication failed"
```powershell
# Use personal access token instead
git remote set-url origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/YOUR_USERNAME/hackathon.git

# Or configure SSH key
# https://docs.github.com/en/authentication/connecting-to-github-with-ssh
```

### Error: "nothing to commit"
```powershell
# Check .gitignore isn't ignoring everything
cat .gitignore

# Make sure files exist
git add .
git status

# Then commit
git commit -m "Initial commit"
```

### Error: "branch is behind origin"
```powershell
# Pull first, then push
git pull origin main
git push origin main
```

---

## 🎯 Quick Setup (Copy-Paste)

```powershell
# Navigate to project
cd c:\Users\sukis\Downloads\hackathon

# Configure git (first time only)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/hackathon.git

# Stage, commit, and push
git add .
git commit -m "Medical Research Assistant - Hackathon Submission"
git branch -M main
git push -u origin main

# Done! ✅
```

---

## ✅ Verification Checklist

After pushing:

- [ ] No errors in push output
- [ ] GitHub repo shows all files
- [ ] `node_modules/` NOT in repo (should be listed in .gitignore)
- [ ] `.env` file NOT in repo (should be listed in .gitignore)
- [ ] `README.md` visible on GitHub repo
- [ ] All docs/ files present
- [ ] backend/ and frontend/ folders present
- [ ] services/ folder present

---

## 🚀 Next Steps After Push

### 1. Railway Backend Deployment

```
1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select your hackathon repository
4. Set environment variables:
   - GROQ_API_KEY=gsk_...
   - MONGODB_URI=...
   - Other vars from .env.example
5. Deploy! ✅
6. Copy your API URL
```

### 2. Vercel Frontend Deployment

```
1. Go to https://vercel.com
2. Add New → Project
3. Import your hackathon repository
4. Framework: Vite
5. Set environment variables:
   - VITE_API_URL=https://your-railway-url
6. Deploy! ✅
7. Copy your frontend URL
```

### 3. Test Live Deployment

```bash
# Test backend
curl https://your-api.railway.app/health

# Test frontend
Open: https://your-app.vercel.app
```

---

## 📝 Git Workflow Going Forward

Every time you make changes:

```powershell
# Make your changes
# ... edit files ...

# Stage changes
git add .

# Commit with message
git commit -m "Feature: description of change"

# Push to GitHub
git push

# Railway and Vercel auto-redeploy! ✅
```

---

## 🎬 Demo Workflow

```
1. Make code changes locally
2. Test on your machine
3. git add . && git commit -m "..." && git push
4. Wait 2-3 minutes
5. Railway redeployed automatically ✅
6. Vercel redeployed automatically ✅
7. Changes live in production!
```

---

**Your code is ready to push!** 🚀

Let me know when it's up on GitHub and I'll help with Railway/Vercel setup.
