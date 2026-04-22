# 🎯 PERSONALIZATION LAYER & CONTEXT-AWARE MEMORY SYSTEM

## Executive Summary
A sophisticated personalization engine that learns from user behavior, maintains conversation context, and adapts search results based on research interests and previous interactions.

---

## 1. USER PROFILE SYSTEM

### Data Structure

```javascript
{
  userId: "user_12345",
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-04-20T14:22:00Z",
  
  // Core interests
  interests: [
    "oncology",
    "immunotherapy",
    "clinical trials"
  ],
  
  // Research areas
  research_areas: [
    "precision medicine",
    "biomarkers",
    "drug discovery"
  ],
  
  // Interaction history
  search_history: [
    {
      query: "NSCLC treatment immunotherapy",
      timestamp: "2024-04-20T14:20:00Z",
      click_through_rate: 0.8,  // User clicked 8 of 10 results
      dwellTime: 2340,  // seconds
      savedResults: 3
    }
  ],
  
  // Source preferences
  preferred_sources: ["pubmed_medline", "clinical_trials"],
  source_weights: {
    pubmed_medline: 1.0,
    clinical_trials: 0.95,
    openalex_journal: 0.7
  },
  
  // Reading level
  complexity_preference: "expert",  // "beginner" | "intermediate" | "expert"
  
  // Saved documents
  saved_documents: [
    {
      docId: "pubmed_12345",
      savedAt: "2024-04-15T10:00:00Z",
      tags: ["important", "review"]
    }
  ],
  
  // Notification preferences
  alerts: [
    {
      query: "PD-L1 checkpoint inhibitors",
      frequency: "weekly",
      enabled: true
    }
  ],
  
  // Research goals
  goals: [
    {
      title: "Find latest NSCLC treatment data",
      status: "active",
      createdAt: "2024-04-01T00:00:00Z"
    }
  ]
}
```

---

## 2. CONVERSATION CONTEXT MANAGEMENT

### Memory Architecture

```
┌─────────────────────────────────────────────────────────┐
│           MULTI-LEVEL CONTEXT MEMORY SYSTEM              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Level 1: SHORT-TERM (Turn-by-turn)                    │
│  ├─ Current query + entities                            │
│  ├─ Previous 2 turns (for immediate context)           │
│  └─ Active entities (disease, stage, treatment)        │
│                                                          │
│  Level 2: SESSION (Conversation-level)                 │
│  ├─ All messages in conversation (ordered)              │
│  ├─ Merged entities across turns                        │
│  ├─ Research intent classification                      │
│  └─ Established context (e.g., "We're discussing NSCLC") │
│                                                          │
│  Level 3: LONG-TERM (User profile)                     │
│  ├─ Historical interests                                │
│  ├─ Favorite sources                                    │
│  ├─ Saved documents                                     │
│  └─ Research patterns                                   │
│                                                          │
│  Level 4: GLOBAL (System-wide)                         │
│  ├─ Trending topics                                     │
│  ├─ Similar user profiles                              │
│  └─ Domain knowledge base                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Conversation Data Model

```javascript
{
  conversationId: "conv_abc123",
  userId: "user_12345",
  title: "NSCLC Treatment Research",
  createdAt: "2024-04-20T10:00:00Z",
  updatedAt: "2024-04-20T14:30:00Z",
  
  // Messages ordered by time
  messages: [
    {
      role: "user",
      content: "What are treatments for stage 3 NSCLC?",
      timestamp: "2024-04-20T10:05:00Z",
      parsed_intent: "treatment",
      extracted_entities: {
        diseases: ["NSCLC"],
        staging: ["3"]
      }
    },
    {
      role: "assistant",
      content: "{ ... response JSON ... }",
      timestamp: "2024-04-20T10:10:00Z",
      sourceDocuments: ["pubmed_12345", "clinicaltrials_67890"]
    },
    {
      role: "user",
      content: "What about immunotherapy specifically?",
      timestamp: "2024-04-20T10:15:00Z",
      parsed_intent: "treatment",
      extracted_entities: {
        treatments: ["immunotherapy"]
      },
      // Context: This is a NARROWING query (same disease, focusing on treatment type)
      context_type: "narrowing",
      parent_message_id: 0  // Refers to first user message
    }
  ],
  
  // Merged entities over conversation
  established_context: {
    primary_disease: "NSCLC",
    disease_stage: "3",
    research_intent: "treatment",
    focus_areas: ["immunotherapy", "chemotherapy"],
    temporal_preference: "recent"
  },
  
  // Topics covered
  topics: ["NSCLC", "oncology", "immunotherapy"],
  
  // Engagement metrics
  metrics: {
    totalTurns: 3,
    averageLatency: 2340,
    userSatisfaction: 0.85
  }
}
```

---

## 3. CONTEXT ADAPTATION STRATEGY

### Query Type Classification

```javascript
class ContextAdapter {
  classifyQueryType(previousContext, currentQuery) {
    /**
     * Returns one of:
     * - "narrowing": Same disease, focusing on specific aspect
     * - "broadening": Adding new diseases/conditions
     * - "lateral": Exploring same disease from different angle
     * - "deepening": More detailed questions about same topic
     * - "restart": New topic entirely
     */
    
    const prevDiseases = previousContext.diseases || [];
    const currDiseases = currentQuery.entities.diseases || [];
    
    // Check overlap
    const intersection = prevDiseases.filter(d => 
      currDiseases.some(c => this.normalize(d) === this.normalize(c))
    );
    
    const overlap = intersection.length > 0 ? intersection.length / prevDiseases.length : 0;
    
    if (overlap > 0.8) {
      // Same disease(s)
      if (currentQuery.entities.treatments?.length > 0) {
        return "narrowing";
      }
      if (currentQuery.intent !== previousContext.intent) {
        return "lateral";
      }
      return "deepening";
    } else if (currDiseases.length > prevDiseases.length) {
      return "broadening";
    }
    
    return "restart";
  }
  
  adaptRetrievalStrategy(queryType, previousResults) {
    /**
     * Adjust retrieval based on query type
     */
    
    switch(queryType) {
      case "narrowing":
        // Can reuse previous results and filter them
        return {
          reuseCache: true,
          cacheHitThreshold: 0.6,
          additionalQueries: 3  // Fetch targeted results
        };
        
      case "lateral":
        // Same disease, different angle
        return {
          reuseCache: true,
          cacheHitThreshold: 0.4,
          additionalQueries: 5
        };
        
      case "deepening":
        // More detail on same topic
        return {
          reuseCache: true,
          expandSearch: true,
          additionalQueries: 2
        };
        
      case "broadening":
        // New diseases
        return {
          reuseCache: false,
          freshRetrieval: true,
          additionalQueries: 8
        };
        
      case "restart":
        // Completely new topic
        return {
          reuseCache: false,
          freshRetrieval: true,
          additionalQueries: 12
        };
    }
  }
}
```

---

## 4. EXAMPLE: CONVERSATION FLOW WITH ADAPTATION

### Turn 1: Initial Query

**User Input:**  
"What are the latest treatments for stage 3 NSCLC?"

**System Processing:**
1. Parse query → Extract: disease=NSCLC, stage=3, intent=treatment
2. Create initial context
3. Retrieve 100+ papers on NSCLC treatment
4. Rank by recency + relevance
5. Generate response

**Context Established:**
```javascript
{
  primary_disease: "NSCLC",
  stage: "3",
  intent: "treatment",
  sources: ["pubmed", "clinicaltrials", "openalex"]
}
```

---

### Turn 2: Narrowing Query (Lateral Move)

**User Input:**  
"What about immunotherapy? Are there any combinations with chemotherapy?"

**System Processing:**
1. Parse → Extract: treatments=[immunotherapy, chemotherapy], intent=treatment
2. Classify: "narrowing" (same NSCLC, focusing on treatment type)
3. **CONTEXT REUSE**: 
   - Merge with previous entities: NSCLC + stage 3
   - Keep previous relevant papers in context
   - Cache hit: 60% of previous results still relevant
4. Retrieve targeted results: immunotherapy + chemotherapy + NSCLC
5. **CONTEXT INJECTION**: 
   - Remind LLM: "As discussed, we're looking at stage 3 NSCLC..."
   - Filter papers: Only show those discussing combination therapy
6. Generate response contrasting monotherapy vs. combination

**Optimization Benefits:**
- ✅ Reduced retrieval latency (reuse cache)
- ✅ Better context injection (LLM knows patient stage)
- ✅ More focused results (filtered by conversation context)

---

### Turn 3: Lateral Query (Different Intent, Same Disease)

**User Input:**  
"What are the main side effects and toxicities I should watch for?"

**System Processing:**
1. Parse → Extract: intent=adverse_effects
2. Classify: "lateral" (same NSCLC, different intent)
3. **CONTEXT REUSE**:
   - Same disease (NSCLC) + stage (3)
   - Previous treatments still relevant (monitoring their toxicity)
   - Cache hit: 40% of papers discuss safety outcomes
4. Retrieve safety-focused papers
5. **CONTEXT INJECTION**:
   - "For the stage 3 NSCLC treatments we discussed (immunotherapy + chemotherapy)..."
   - Specific toxicities matching the treatments mentioned
6. Generate side effects + management strategies

---

## 5. PERSONALIZATION SCORING

### Boost Formula

```
Adjusted Score = Base Score × (1 + Personalization Boost)

Where:

Personalization Boost = 
  (0.40 × Source Preference Boost) +
  (0.35 × Interest Alignment) +
  (0.15 × Complexity Match) +
  (0.10 × Recency Preference)

Source Preference Boost = 
  user.source_weights[document.source_type] || 0.7

Interest Alignment = 
  count(document_keywords ∩ user_interests) / 10

Complexity Match = 
  1.0 if (document_level == user_complexity_preference)
  0.8 if (|document_level - user_complexity_preference| == 1)
  0.5 otherwise

Recency Preference =
  0.5 if (document_age > user.recency_preference)
  1.0 if (document_age <= user.recency_preference)
```

### Example: Applying Personalization

**User Profile:**
```javascript
{
  interests: ["immunotherapy", "biomarkers"],
  research_areas: ["precision medicine"],
  preferred_sources: ["pubmed_medline", "clinical_trials"],
  source_weights: {
    pubmed_medline: 1.0,
    clinical_trials: 0.95,
    openalex_journal: 0.6
  },
  complexity_preference: "expert"
}
```

**Paper 1 (Before Personalization):**
```
Title: "PD-L1 Biomarker Predicts Immunotherapy Response"
Journal: Nature Medicine
Source: pubmed_medline
Base Score: 0.78
```

**Personalization Calculation:**
- Source: pubmed (weight=1.0) → +0.40
- Interests: Keywords "PD-L1", "immunotherapy", "biomarkers" match user's interests → +0.35
- Complexity: Expert-level paper → +0.15
- Recency: Published 2024 (within preference) → +0.10
- **Total Boost: 1.0**
- **Final Score: 0.78 × 2.0 = 1.56** (capped at 1.0) → **1.0**

**Paper 2 (Before Personalization):**
```
Title: "NSCLC: A General Overview for Patients"
Journal: Patient Education Blog
Source: openalex_journal
Base Score: 0.45
```

**Personalization Calculation:**
- Source: openalex (weight=0.6) → +0.24
- Interests: Generic, not specific to biomarkers/immunotherapy → +0.05
- Complexity: Beginner level (user prefers expert) → -0.15
- Recency: 2023 (slightly older) → +0.08
- **Total Boost: 0.22**
- **Final Score: 0.45 × 1.22 = 0.549** → **0.549**

**Result:**
Paper 1 boosted from 0.78 → 1.0 (ranks #1)  
Paper 2 decreased from 0.45 → 0.549 (ranks lower)

---

## 6. LEARNING FROM USER BEHAVIOR

### Engagement Signals

```javascript
// Track what users actually find valuable
{
  interaction: "click_paper",
  docId: "pubmed_12345",
  timeSpent: 150,  // seconds
  percentageScrolled: 0.75,
  queryId: "query_abc123",
  conversationId: "conv_xyz789",
  timestamp: "2024-04-20T10:30:00Z"
}

// Signals:
// - Long time on page + high scroll = relevant
// - Saved document = high relevance
// - Follow-up question about paper = interested in topic
// - No engagement = irrelevant
```

### Dynamic Interest Update

```javascript
// Every week, update user interests based on:
function updateInterestProfile(user, interactions) {
  const topicEngagement = {};
  
  interactions.forEach(interaction => {
    if (interaction.interaction === 'click_paper' && interaction.percentageScrolled > 0.5) {
      const topics = extractTopics(interaction.document);
      topics.forEach(topic => {
        topicEngagement[topic] = (topicEngagement[topic] || 0) + interaction.timeSpent;
      });
    }
  });
  
  // Add high-engagement topics to interests
  const newTopics = Object.entries(topicEngagement)
    .filter(([_, score]) => score > 300)  // > 5 minutes engagement
    .map(([topic, _]) => topic)
    .slice(0, 3);
  
  user.interests = [...new Set([...user.interests, ...newTopics])];
  user.interests = user.interests.slice(0, 10);  // Keep top 10
}
```

---

## 7. COLLABORATIVE FILTERING (ADVANCED)

For hackathon enhancement:

```javascript
// Find similar users
function findSimilarUsers(targetUser) {
  /**
   * Cosine similarity between user interest vectors
   */
  const similarities = users
    .filter(u => u.userId !== targetUser.userId)
    .map(user => ({
      userId: user.userId,
      similarity: cosineSimilarity(
        targetUser.interests,
        user.interests
      )
    }))
    .filter(u => u.similarity > 0.6)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
  
  return similarities;
}

// Recommend papers liked by similar users
function getCollaborativeRecommendations(user) {
  const similarUsers = findSimilarUsers(user);
  
  // Get papers saved by similar users
  const recommendedPapers = [];
  
  similarUsers.forEach(similar => {
    const similarUserDoc = getUserProfile(similar.userId);
    const theirSavedDocs = similarUserDoc.saved_documents || [];
    
    theirSavedDocs.forEach(doc => {
      if (!user.saved_documents.find(d => d.docId === doc.docId)) {
        recommendedPapers.push({
          docId: doc.docId,
          score: 0.7 * similar.similarity,  // Boost by similarity
          reason: `Recommended by researcher with similar interests`
        });
      }
    });
  });
  
  return recommendedPapers.sort((a, b) => b.score - a.score);
}
```

---

## 8. PRIVACY & ETHICAL CONSIDERATIONS

### Data Privacy

```javascript
// Implement GDPR compliance:
- User consent for personalization
- Ability to delete conversation history
- Transparent data usage
- No user data shared with third parties
- Anonymized analytics only

// Implement retention policy:
- Conversations: 6 months (configurable)
- User profile: Until account deletion
- Interaction logs: 3 months (anonymized after)
- Search cache: 7 days
```

### Algorithmic Fairness

```javascript
// Prevent filter bubbles:
1. Don't only recommend papers in user's favorite sources
2. Occasionally expose contrarian/minority viewpoints
3. Include landmark older papers (not just recency bias)
4. Diversity in paper types (mix RCTs, case studies, editorials)

// Prevent bias:
- Don't discriminate based on user demographics
- Same relevance algorithm for all users
- Personalization as BOOST, not filter
- Transparency in why papers are ranked
```

---

## 9. IMPLEMENTATION: CONTEXT MIDDLEWARE

```javascript
// Express middleware for context management
const contextMiddleware = (req, res, next) => {
  const { userId, conversationId } = req.body;
  
  // Fetch user profile + conversation history in parallel
  Promise.all([
    getUserProfile(userId),
    conversationId ? getConversation(userId, conversationId) : Promise.resolve(null)
  ]).then(([userProfile, conversation]) => {
    req.userContext = {
      user: userProfile,
      conversation: conversation,
      establishedEntities: conversation?.established_context || {},
      isNewConversation: !conversation
    };
    next();
  }).catch(err => {
    req.logger.error('Context load error:', err);
    // Continue without context rather than fail
    req.userContext = { user: null, conversation: null };
    next();
  });
};

app.use(contextMiddleware);

// Then in search route:
router.post('/', async (req, res) => {
  const { query, userId, conversationId } = req.body;
  const context = req.userContext;
  
  // Pass context through entire pipeline
  const parsedQuery = queryService.parseQuery(query, context.conversation);
  const expandedQueries = queryService.expandQuery(parsedQuery);
  
  // ... retrieval, ranking with context ...
  
  const rankedPapers = rankingService.rankDocuments(
    retrievedDocs,
    query,
    context.user  // ← Personalization applied here
  );
});
```

---

## 10. PERSONALIZATION METRICS & ANALYTICS

```javascript
// Track personalization effectiveness
{
  metric: "click_through_rate",
  withPersonalization: 0.72,
  withoutPersonalization: 0.45,
  improvement: 60%
}

{
  metric: "average_dwell_time_on_results",
  withPersonalization: 185,  // seconds
  withoutPersonalization: 95,
  improvement: 95%
}

{
  metric: "conversation_length",
  withPersonalization: 4.2,  // average turns
  withoutPersonalization: 2.1,
  improvement: 100%
}

{
  metric: "user_satisfaction_rating",
  withPersonalization: 4.3,  // out of 5
  withoutPersonalization: 3.2,
  improvement: 34%
}
```

---

## Summary: Key Advantages

✅ **Context Awareness**: System remembers conversation scope  
✅ **Reduced Latency**: Reuses previous results when applicable  
✅ **Better Relevance**: Filters and ranks by user interests  
✅ **Conversational Continuity**: LLM knows context  
✅ **Learning**: Adapts to user behavior over time  
✅ **Transparency**: Shows why results are ranked  
✅ **Privacy-First**: User data stays private  

This is what separates a basic medical search tool from a **world-class research assistant**.
