# DEPLOYMENT & GETTING STARTED GUIDE

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional, for production)
- Ollama (for LLM)

### 1. Setup Environment

```bash
# Clone/setup repo structure
cd hackathon

# Backend setup
cd backend
cp .env.example .env
# Edit .env with your settings
npm install

# Frontend setup
cd ../frontend
npm install

cd ..
```

### 2. Start Services

```bash
# Terminal 1: MongoDB
# Use local: mongod
# Or Atlas: update MONGODB_URI in .env

# Terminal 2: Redis (optional)
redis-server

# Terminal 3: Ollama with Llama 2
ollama pull llama2:13b-chat
ollama serve

# Terminal 4: Backend
cd backend
npm run dev

# Terminal 5: Frontend
cd frontend
npm run dev
```

Visit http://localhost:5173 🎉

---

## Production Deployment

### Option A: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: medical_research_assistant

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://mongodb:27017/medical_research_assistant
      REDIS_HOST: redis
      OLLAMA_URL: http://ollama:11434
    depends_on:
      - mongodb
      - redis
      - ollama

volumes:
  mongo_data:
  ollama_data:
```

```bash
docker-compose up -d
```

### Option B: Railway / Render

1. **Push to GitHub**
   ```bash
   git init
   git remote add origin https://github.com/yourusername/medical-research-assistant
   git push origin main
   ```

2. **Connect to Railway/Render**
   - Create new project
   - Select GitHub repo
   - Set build command: `cd backend && npm install && cd ../frontend && npm install && npm run build`
   - Set start command: `node backend/index.js`
   - Add MongoDB, Redis, Ollama services
   - Set environment variables

3. **Deploy**
   ```bash
   # Railway CLI
   railway up
   
   # Or Render: auto-deploys on push
   ```

### Option C: AWS/GCP/Azure

**Recommended Architecture:**
```
┌─────────────┐
│   CloudFront│ (CDN)
│     CDN     │
└──────┬──────┘
       │
    ┌──▼──┐
    │ App │ (Load Balanced ECS/K8s)
    │ API │
    └──┬──┘
       │
   ┌───┴────┬────────┐
   ▼        ▼        ▼
MongoDB  Redis   Ollama
(Atlas) (Cache) (GPU Instance)
```

**Terraform example:**
```hcl
# infrastructure/main.tf
resource "aws_ecs_cluster" "app" {
  name = "medical-research-assistant"
}

resource "aws_ecs_service" "app" {
  name           = "app"
  cluster        = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count  = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }
}
```

---

## Configuration

### Environment Variables

**Backend (.env)**
```env
# Server
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/medical_research_assistant

# Cache
REDIS_HOST=redis.example.com
REDIS_PASSWORD=secure_password

# APIs
PUBMED_API_KEY=your_key_here
OPENALEX_API_KEY=

# LLM
OLLAMA_URL=http://ollama:11434
LLM_MODEL=llama2:13b-chat

# Session
SESSION_SECRET=very_long_random_string_here
```

**Frontend (.env.production)**
```env
VITE_API_URL=https://api.yourdomain.com
```

---

## Performance Tuning

### Database Optimization

```javascript
// Create indexes for optimal query performance

db.conversations.createIndex({ userId: 1, createdAt: -1 });
db.search_cache.createIndex({ queryHash: 1 });
db.search_cache.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }  // TTL index
);
db.user_profiles.createIndex({ userId: 1 }, { unique: true });
```

### Redis Caching Strategy

```javascript
// Cache hot queries (popular searches)
const hotQueries = [
  'cancer treatment',
  'diabetes management',
  'COVID-19 vaccines'
];

hotQueries.forEach(q => {
  cache.setex(
    `hot:${q}`,
    7 * 24 * 60 * 60,  // 7 days
    JSON.stringify(results)
  );
});
```

### LLM Optimization

```bash
# Use smaller model for faster response (quality trade-off)
ollama pull llama2:7b-chat

# Or use quantized version
ollama pull llama2:13b-chat-q4_K_M  # Quantized 4-bit
```

### Frontend Optimization

```bash
# Production build with optimizations
cd frontend
npm run build

# Check bundle size
npx vite-bundle-visualizer

# Enable gzip compression
# (Add to backend/index.js)
app.use(compression());
```

---

## Monitoring & Logging

### Application Metrics

```javascript
// Example: Monitor search performance
const metrics = {
  avgRetrievalTime: 0,
  avgRankingTime: 0,
  avgLlmGenerationTime: 0,
  cacheHitRate: 0,
  errorRate: 0
};

// Track these in monitoring dashboard
```

### Logging Setup

```bash
# Using Datadog (recommended for hackathons)
npm install dd-trace

# Or ELK Stack (Elasticsearch, Logstash, Kibana)
```

### Error Tracking

```bash
# Using Sentry
npm install @sentry/node

# Initialize in backend/index.js
const Sentry = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

---

## Cost Optimization

| Service | Recommendation | Estimated Cost |
|---------|--------------|-----------------|
| **MongoDB Atlas** | M0 Free (dev) → M2 (prod) | $0-150/month |
| **Redis** | Local (dev) → Cloud (prod) | $0-50/month |
| **Ollama** | Self-hosted (minimal) | $0-100/month (infra) |
| **Frontend Hosting** | Vercel/Netlify | Free-50/month |
| **CDN** | Cloudflare | Free-200/month |
| **API Costs** | PubMed/OpenAlex Free | $0 |
| | ClinicalTrials.gov Free | $0 |
| **Total (Startup)** | | **$0-300/month** |
| **Total (Scale)** | | **$300-1000/month** |

**Cost Reduction Tips:**
1. Use free API keys (all 3 sources are free)
2. Self-host Ollama (don't use cloud LLMs)
3. Implement aggressive caching
4. Use serverless for non-critical functions

---

## Troubleshooting

### Issue: Ollama not responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If error, restart:
ollama serve

# Check logs
journalctl -u ollama -f  # On systemd
```

### Issue: Slow searches

```bash
# Check MongoDB indexes
db.conversations.getIndexes()

# Rebuild if needed
db.conversations.dropIndex("userId_1_createdAt_-1")
db.conversations.createIndex({ userId: 1, createdAt: -1 })
```

### Issue: High memory usage

```bash
# Reduce LLM model size
ollama pull llama2:7b-chat

# Or use quantized version
ollama pull mistral:7b-instruct-q4_K_M
```

---

## Scaling Strategy

### Phase 1: MVP (0-1000 users)
- Single Node.js instance
- MongoDB Atlas shared tier
- Redis Cloud free tier
- Ollama on small GPU instance

### Phase 2: Growth (1000-10K users)
- Load balancer (nginx)
- 2-3 Node.js replicas
- MongoDB sharded cluster
- Redis dedicated instance
- Ollama cluster (multiple instances)

### Phase 3: Scale (10K+ users)
- Kubernetes cluster (EKS/GKE/AKS)
- Auto-scaling based on load
- Database read replicas
- CDN for static assets
- Multiple Ollama nodes with load balancing

---

## Next Steps

1. **Beta Testing**: Invite medical students/researchers
2. **Feedback Loop**: Collect usage metrics and improve ranking
3. **Fine-tuning**: Consider fine-tuning Llama on medical literature
4. **Partnerships**: Connect with academic institutions
5. **Monetization**: Premium features (advanced filters, export PDF, API access)

---

## Support

- **Docs**: Check `/docs` folder
- **Issues**: GitHub Issues
- **Community**: Discord channel (if hosted)

---

**Made with ❤️ for medical research**

