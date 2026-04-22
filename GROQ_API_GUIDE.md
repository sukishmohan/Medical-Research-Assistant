# 🔑 Groq API Setup & Configuration

Complete guide to setting up and using Groq API for your Medical Research Assistant.

---

## 🎯 What is Groq?

**Groq** is a free AI API service that provides access to **Llama 3.1** (fastest open-source LLM).

### Why Groq Instead of Ollama?

| Aspect | Ollama | Groq |
|--------|--------|------|
| **Setup** | Requires local GPU/CPU | Cloud-based, no setup |
| **Model** | llama2:13b | llama-3.1-70b-versatile |
| **Speed** | Slower on weak hardware | Ultra-fast (inference optimized) |
| **Cost** | Free (hardware cost) | Free (10K calls/day) |
| **Deployment** | Must run locally | Works from anywhere |
| **DevOps** | Complex | Simple API call |

**For hackathon**: Groq is the clear winner. ✅

---

## 🚀 Getting Started

### 1. Create Groq Account

```
1. Go to: https://console.groq.com
2. Sign up with email
3. Verify email
4. Welcome! 🎉
```

### 2. Generate API Key

```
1. Dashboard → API Keys
2. Click "Create New API Key"
3. Copy key: gsk_XXXXXXXXXXXXX
4. Save securely
```

### 3. Add to .env

```bash
# .env
GROQ_API_KEY=gsk_XXXXXXXXXXXXX
```

---

## 📊 Free Tier Limits

```
┌────────────────────────────────────────┐
│  Groq Free Tier (per day)              │
├────────────────────────────────────────┤
│  • 10,000 API calls per day            │
│  • 6 requests per minute               │
│  • Max 2048 tokens per request         │
│  • All Llama models available          │
│  • 100% free, no credit card needed    │
└────────────────────────────────────────┘
```

### Typical Usage

```
Your app searches for medical research:
- 1 search = ~100 tokens
- 10,000 calls/day = 1,000+ daily searches
- More than enough for hackathon!
```

---

## 🧠 Available Models

Groq provides these models (all free):

```
1. llama-3.1-70b-versatile  ✅ RECOMMENDED
   - Fastest, best balance
   - 70B parameters
   - Perfect for medical synthesis

2. llama-3.1-8b-instant
   - Smaller, even faster
   - Less accurate for complex tasks
   - Good for simple queries

3. mixtral-8x7b-32768
   - Mixture of experts
   - Great for diverse tasks

4. gemma-7b-it
   - Lightweight
   - Good for mobile

Default: llama-3.1-70b-versatile ✅
```

Your system uses the **recommended** model automatically.

---

## 🔗 API Endpoint

```
https://api.groq.com/openai/v1/chat/completions
```

### Groq uses OpenAI-compatible format:

```python
import requests

response = requests.post(
    "https://api.groq.com/openai/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "model": "llama-3.1-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are a medical expert."},
            {"role": "user", "content": "What is NSCLC?"}
        ],
        "temperature": 0.3,
        "max_tokens": 1024
    }
)

print(response.json()["choices"][0]["message"]["content"])
```

---

## ✅ Verify Your Setup

### Test 1: Check API Key

```bash
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer gsk_YOUR_KEY_HERE"
```

Expected response: List of available models ✅

### Test 2: Generate Response

```bash
curl https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer gsk_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-70b-versatile",
    "messages": [
      {"role": "user", "content": "Say OK"}
    ],
    "max_tokens": 10
  }'
```

Expected response: `{"choices":[{"message":{"content":"OK"}}]}` ✅

### Test 3: Your Backend

```bash
# After starting backend
curl http://localhost:3000/api/llm/health

# Expected:
{
  "healthy": true,
  "model": "llama-3.1-70b-versatile",
  "api": "groq"
}
```

---

## 🔧 Configuration

### In Your Code (Node.js)

```javascript
const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.1-70b-versatile';

async function queryGroq(userMessage) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a medical expert.' },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 1024
    },
    {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data.choices[0].message.content;
}
```

Your system already has this built-in! ✅

---

## 📈 Usage Monitoring

### Check Your Usage

```
1. Go to: https://console.groq.com
2. Click "Usage"
3. See daily call count
4. Track remaining quota
```

### Example Daily Pattern

```
Time      Calls   Tokens Used
---------  -----   -----------
00:00      100     10,000
06:00      300     30,000
12:00      500     50,000
18:00      200     20,000
23:59      ----    ----
TOTAL    1,100    110,000
          ✅ Well under 10K calls/day limit
```

---

## 🚨 Common Issues & Solutions

### Issue: 401 Unauthorized

**Problem**: API key is invalid or expired

**Solution**:
```bash
# 1. Check .env has correct key
cat .env | grep GROQ_API_KEY

# 2. Generate new key at https://console.groq.com
# 3. Update .env
# 4. Restart backend
```

### Issue: 429 Rate Limited

**Problem**: Exceeded 6 requests/minute

**Solution**:
```javascript
// Add rate limiting in your code
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function queryWithRateLimit(message) {
  try {
    return await queryGroq(message);
  } catch (error) {
    if (error.status === 429) {
      console.log('Rate limited, waiting 10 seconds...');
      await delay(10000);
      return queryGroq(message);  // Retry
    }
    throw error;
  }
}
```

### Issue: Quota Exceeded

**Problem**: Used 10,000 calls in a day

**Solution**:
```
1. Wait for next day (quota resets at UTC midnight)
2. Use different Groq account (create new one)
3. Deploy backup using HuggingFace or other API
```

---

## 💡 Best Practices

### 1. Temperature Settings

```
temperature: 0.3  ← Use for factual responses (MEDICAL)
temperature: 0.7  ← Use for creative tasks
temperature: 1.0  ← Maximum randomness
```

Your system uses **0.3** ✅ (correct for medical)

### 2. Token Limits

```
max_tokens: 512   ← Quick summaries
max_tokens: 1024  ← Detailed responses (YOUR SYSTEM)
max_tokens: 2048  ← Maximum allowed
```

### 3. System Prompts

```javascript
const systemPrompt = `You are an expert medical researcher.
Only cite information from provided documents.
Flag uncertain claims with [CAVEAT: reason]`;
```

Your system has comprehensive prompts ✅

### 4. Error Handling

```javascript
try {
  const response = await queryGroq(message);
  return response;
} catch (error) {
  if (error.response?.status === 401) {
    // Invalid API key
  } else if (error.response?.status === 429) {
    // Rate limited
  } else if (error.code === 'ECONNREFUSED') {
    // Network error
  }
  // Return fallback response
}
```

Your system has this built-in ✅

---

## 🌍 Deployment Considerations

### When Deploying to Cloud:

1. **Never commit API key to Git**
   ```bash
   # Add to .gitignore
   echo "GROQ_API_KEY" >> .gitignore
   ```

2. **Set secrets in deployment platform**
   - Railway: Add to environment variables
   - Vercel: Add to project settings
   - GitHub: Add to secrets (for CI/CD)

3. **API key is safe in code after deployment**
   ```
   Your code runs on Railway servers
   API key never exposed to frontend
   All secure ✅
   ```

### Example: Railway Deployment

```
1. Go to Railway dashboard
2. Click your project
3. Add environment variables:
   GROQ_API_KEY=gsk_YOUR_KEY_HERE
4. Railway auto-deploys ✅
```

---

## 📚 Resources

- **Groq Console**: https://console.groq.com
- **API Docs**: https://console.groq.com/docs
- **Status Page**: https://status.groq.com
- **Community**: https://github.com/groq/community

---

## 🎯 Quick Reference

```bash
# Get your API key
Visit: https://console.groq.com
Dashboard → API Keys → Create

# Test endpoint
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer YOUR_KEY"

# Model name
llama-3.1-70b-versatile

# Rate limit
6 requests/minute, 10K calls/day

# Temperature
0.3 for medical (factual)

# Max tokens
2048 per request
```

---

**Your system is configured and ready to use Groq! 🚀**

Questions? Check [DEPLOYMENT_CLOUD.md](./DEPLOYMENT_CLOUD.md) or [QUICKSTART_LOCAL.md](./QUICKSTART_LOCAL.md)
