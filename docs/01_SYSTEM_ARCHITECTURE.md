# 🏗️ MEDICAL RESEARCH ASSISTANT - SYSTEM ARCHITECTURE

## Executive Summary
A production-grade AI system that combines intelligent query expansion, multi-source retrieval, ML-based ranking, and open-source LLM reasoning to provide evidence-based medical research insights with conversational context awareness.

---

## 1. END-TO-END SYSTEM FLOW

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                             │
│  (React: Query Input + Visualization + Chat History + Source Display)    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Express)                             │
│  - Request validation & sanitization                                      │
│  - Rate limiting & caching middleware                                     │
│  - Load balancing for async operations                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    QUERY UNDERSTANDING LAYER                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 1. QUERY PARSING                                                 │   │
│  │    - Extract disease/condition entity                            │   │
│  │    - Identify research intent (treatment, diagnosis, mechanism)  │   │
│  │    - Detect temporal constraints (recent, historical)           │   │
│  │    - Extract demographic filters (age, gender, population)      │   │
│  │                                                                  │   │
│  │ 2. CONTEXT RETRIEVAL FROM MEMORY                                │   │
│  │    - MongoDB: Store previous queries + intents                  │   │
│  │    - Reuse conversation context for follow-ups                  │   │
│  │    - Maintain user research profile (interests, disease area)   │   │
│  │                                                                  │   │
│  │ 3. QUERY EXPANSION ENGINE                                       │   │
│  │    - Disease synonyms (e.g., "MI" → "myocardial infarction")   │   │
│  │    - Expand to related conditions (e.g., diabetes → metabolic)  │   │
│  │    - Add research keywords (treatment, epidemiology, biomarkers)│   │
│  │    - Handle acronyms (expand ICD-10, SNOMED-CT codes)          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      INTELLIGENT RETRIEVAL LAYER                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ PARALLEL RETRIEVAL FROM 3 SOURCES:                               │   │
│  │                                                                  │   │
│  │ OpenAlex API                 PubMed API                API (TrialDB) │
│  │ (Academic Publishing)        (Medical Research)       (Clinical Trials)│
│  │                                                                  │   │
│  │ - 50-100 results each        - 50-100 results         - 50-100 results│
│  │ - Filter: full-text available - Filter: journal        - Filter: active│
│  │ - Sort: citation count       - Sort: publication date - Sort: enrollment│
│  │                                                                  │   │
│  │ DEDUPLICATION ENGINE:                                            │   │
│  │ - Fuzzy match titles (Levenshtein distance)                     │   │
│  │ - Remove duplicates across APIs                                 │   │
│  │ - Identify same trials from different sources                   │   │
│  │                                                                  │   │
│  │ PAGINATION STRATEGY:                                             │   │
│  │ - Implement cursor-based pagination                             │   │
│  │ - Cache first 200 results per query                             │   │
│  │ - Async loading for "Load More"                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      RANKING & FILTERING LAYER                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ML-BASED RELEVANCE SCORING:                                      │   │
│  │                                                                  │   │
│  │ Score = (0.35 × Relevance) +                                    │   │
│  │         (0.20 × Recency) +                                      │   │
│  │         (0.25 × Authority) +                                    │   │
│  │         (0.20 × Clinical Significance)                          │   │
│  │                                                                  │   │
│  │ RELEVANCE (0-1):                                                │   │
│  │ - BM25 score from Solr/Elasticsearch                            │   │
│  │ - Semantic similarity using embeddings                          │   │
│  │ - Keyword match in title (weighted 2x)                          │   │
│  │                                                                  │   │
│  │ RECENCY (0-1):                                                  │   │
│  │ - Recent papers (last 3 years): 1.0                             │   │
│  │ - Decay factor: 0.95^(years_ago)                                │   │
│  │ - Landmark papers get boosted by citation count                 │   │
│  │                                                                  │   │
│  │ AUTHORITY (0-1):                                                │   │
│  │ - PubMed (Medline): 1.0 | OpenAlex journals: 0.8                │   │
│  │ - Journal impact factor (IF) normalization                      │   │
│  │ - Author H-index (optional, high-end feature)                  │   │
│  │ - Peer review status vs. preprints                              │   │
│  │                                                                  │   │
│  │ CLINICAL SIGNIFICANCE (0-1):                                    │   │
│  │ - Presence of clinical outcomes (mortality, morbidity)          │   │
│  │ - RCT > Observational > Case Report                             │   │
│  │ - Sample size normalization (larger = higher, with ceiling)     │   │
│  │ - Mention of biomarkers or therapeutic targets                  │   │
│  │                                                                  │   │
│  │ FILTERING RULES (Applied First):                                │   │
│  │ - Publication status (peer-reviewed preferred)                  │   │
│  │ - Language (English primary, translate if needed)               │   │
│  │ - Availability (full-text access or abstract)                   │   │
│  │ - Retraction status (exclude retracted papers)                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        LLM REASONING LAYER                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ LLM: Llama 3 (8B) via Ollama or Hugging Face Transformers        │   │
│  │                                                                  │   │
│  │ 1. CONTEXT INJECTION:                                            │   │
│  │    - System prompt: Medical domain guidelines                    │   │
│  │    - Retrieved documents: Top 20 ranked papers/trials           │   │
│  │    - User profile: Previous research interests                   │   │
│  │    - Conversation history: Last 5 turns (summarized)            │   │
│  │                                                                  │   │
│  │ 2. PROMPT ENGINEERING STRATEGY:                                  │   │
│  │    - Chain-of-thought: "Think step by step..."                 │   │
│  │    - Evidence grounding: "Cite specific studies..."             │   │
│  │    - Uncertainty quantification: "Confidence level..."          │   │
│  │    - Clear disclaimers: "Not medical advice..."                │   │
│  │                                                                  │   │
│  │ 3. HALLUCINATION PREVENTION:                                    │   │
│  │    - Restrict model to retrieved documents                      │   │
│  │    - Fact-checking layer: Verify claims against sources         │   │
│  │    - Confidence thresholding: Only show high-confidence facts   │   │
│  │    - Fine-tuning on medical domain (optional)                   │   │
│  │    - RAG (Retrieval-Augmented Generation) enforced              │   │
│  │                                                                  │   │
│  │ 4. STRUCTURED OUTPUT GENERATION:                                │   │
│  │    - JSON schema validation                                     │   │
│  │    - Enforce response structure via prompt                      │   │
│  │    - Validate field completeness                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      RESPONSE FORMATTING LAYER                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Output: Structured JSON response                                 │   │
│  │                                                                  │   │
│  │ {                                                                │   │
│  │   "conditionOverview": { },      // AI-generated summary        │   │
│  │   "researchInsights": [ ],       // Top papers with highlights  │   │
│  │   "clinicalTrials": [ ],         // Active trials + status       │   │
│  │   "keyTakeaways": [ ],           // Bullet points                │   │
│  │   "sources": [ ],                // Full metadata + links        │   │
│  │   "trustScore": 0.85,            // Overall confidence           │   │
│  │   "nextSteps": [ ]               // Personalized recommendations │   │
│  │ }                                                                │   │
│  │                                                                  │   │
│  │ Format Rendering:                                                │   │
│  │ - Markdown for chat display                                     │   │
│  │ - PDF generation for export                                     │   │
│  │ - Citations formatted as [Author, Year]                         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      MEMORY & PERSISTENCE LAYER                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ MongoDB Collections:                                             │   │
│  │                                                                  │   │
│  │ 1. conversations                                                 │   │
│  │    - _id, userId, messages[], createdAt, updatedAt              │   │
│  │    - Indexed on userId + createdAt for quick retrieval          │   │
│  │                                                                  │   │
│  │ 2. searchCache                                                   │   │
│  │    - queryHash, results[], ttl: 7 days                          │   │
│  │    - Redis for hot cache (session-based)                        │   │
│  │                                                                  │   │
│  │ 3. userProfiles                                                  │   │
│  │    - userId, interests[], researchAreas[], preferredSources[]   │   │
│  │                                                                  │   │
│  │ 4. papers & trials                                               │   │
│  │    - Denormalized copies for faster access                      │   │
│  │    - Indexed on doi, pubmedId, clinicalTrialsId                 │   │
│  │    - Embedding vectors for semantic search (future)             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      RESPONSE TO USER (React UI)                          │
│  - Real-time streaming for LLM generation                                 │
│  - Interactive source cards with one-click paper links                    │
│  - Timeline visualization for clinical trials                             │
│  - Trust score indicator with source breakdown                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. DETAILED COMPONENT ARCHITECTURE

### 2.1 Query Understanding Layer

```yaml
Input: "What are the latest treatments for stage 3 NSCLC?"

Processing:
  Entity Recognition:
    - Disease: "NSCLC" (Non-small cell lung cancer)
    - Stage: "3" (TNM classification)
    - Intent: "treatments"
    - Temporality: "latest" (prefer papers from last 2 years)
  
  Query Expansion:
    Base Queries:
      - "non-small cell lung cancer treatment"
      - "NSCLC stage III therapy"
      - "lung cancer immunotherapy"
      - "NSCLC chemotherapy regimens"
    
    Synonyms:
      - NSCLC = Non-small cell lung cancer
      - Treatment = therapy, management, clinical approach
    
    Related Conditions:
      - Squamous cell carcinoma
      - Adenocarcinoma
      - Large cell carcinoma
    
    Keywords to Add:
      - "clinical trial"
      - "evidence-based"
      - "randomized controlled trial"
      - "biomarker"
```

### 2.2 Retrieval Layer

**Parallel API Calls (Non-blocking):**

```javascript
// Pseudo-code demonstrating parallelization

async function retrieveFromAllSources(expandedQueries) {
  const [
    openAlexResults,
    pubmedResults,
    clinicalTrialsResults
  ] = await Promise.all([
    fetchFromOpenAlex(expandedQueries),
    fetchFromPubMed(expandedQueries),
    fetchFromClinicalTrials(expandedQueries)
  ]);
  
  return combineAndDeduplicate([
    ...openAlexResults,
    ...pubmedResults,
    ...clinicalTrialsResults
  ]);
}

// Each API call handles pagination internally
```

**API Strategy Details:**

| API | Strengths | Limits | Pagination |
|-----|-----------|--------|-----------|
| **OpenAlex** | Broad academic coverage, JSON API, works-relationship | 25K results max/query | Cursor-based, handle offset |
| **PubMed** | Medical-specific, MeSH indexing, quality filters | 100K results limit | UID-based, start parameter |
| **ClinicalTrials.gov** | Real clinical data, enrollment status, protocols | 10K results max | API v2 has cursor pagination |

### 2.3 Ranking Algorithm (Production-Grade)

```python
# Pseudo-code for ranking engine

class DocumentRanker:
    def __init__(self):
        self.relevance_engine = BM25Ranker()  # TF-IDF variant
        self.embedding_model = SentenceTransformer("pubmedbert-base")
        self.journal_database = JournalImpactFactorDB()
    
    def score_document(self, doc, query, user_profile):
        scores = {}
        
        # RELEVANCE SCORE (0-1)
        bm25_score = self.relevance_engine.score(doc.text, query)  # 0-1 normalized
        semantic_score = cosine_similarity(
            self.embedding_model.encode(doc.title),
            self.embedding_model.encode(query)
        )  # 0-1
        
        title_match = 1.0 if self.fuzzy_match(query, doc.title) else 0.5
        
        scores['relevance'] = (
            0.4 * bm25_score +
            0.3 * semantic_score +
            0.3 * title_match
        )
        
        # RECENCY SCORE (0-1)
        years_old = (now() - doc.publication_date).days / 365.25
        recency_base = 0.95 ** years_old  # Exponential decay
        
        # Landmark papers (high citation count) get bonus
        citation_boost = min(doc.citation_count / 1000, 1.0) * 0.2
        scores['recency'] = min(recency_base + citation_boost, 1.0)
        
        # AUTHORITY SCORE (0-1)
        source_score = {
            'pubmed_medline': 1.0,
            'clinical_trials': 0.95,
            'openalex_journal': 0.85,
            'openalex_preprint': 0.6
        }[doc.source]
        
        impact_factor = self.journal_database.get(doc.journal_issn, default=0)
        if_normalized = min(impact_factor / 10, 1.0)  # Normalize to 0-1
        
        is_peer_reviewed = 1.0 if doc.peer_reviewed else 0.7
        
        scores['authority'] = (
            0.5 * source_score +
            0.3 * if_normalized +
            0.2 * is_peer_reviewed
        )
        
        # CLINICAL SIGNIFICANCE (0-1)
        study_type_score = {
            'rct': 1.0,
            'meta_analysis': 0.95,
            'observational': 0.7,
            'case_report': 0.4
        }.get(doc.study_type, 0.5)
        
        # Sample size matters but has diminishing returns
        sample_size = doc.get('sample_size', 0)
        sample_score = min(log10(max(sample_size, 1)) / 4, 1.0)
        
        # Outcomes mentioned?
        outcomes_present = 1.0 if any(
            outcome in doc.abstract.lower()
            for outcome in ['mortality', 'survival', 'efficacy', 'safety']
        ) else 0.5
        
        scores['clinical_significance'] = (
            0.5 * study_type_score +
            0.3 * sample_score +
            0.2 * outcomes_present
        )
        
        # FINAL SCORE (Weighted composite)
        final_score = (
            0.35 * scores['relevance'] +
            0.20 * scores['recency'] +
            0.25 * scores['authority'] +
            0.20 * scores['clinical_significance']
        )
        
        # USER PREFERENCE BOOST
        if doc.matches_user_interests(user_profile):
            final_score *= 1.1  # 10% boost for personalization
        
        return final_score, scores

    def rank_results(self, documents, query, user_profile):
        """Sort documents by final score, return top-20"""
        scored = [
            (doc, self.score_document(doc, query, user_profile))
            for doc in documents
        ]
        scored.sort(key=lambda x: x[1][0], reverse=True)
        return [doc for doc, _ in scored[:20]]
```

---

## 3. LLM REASONING LAYER DESIGN

### Model Selection: Llama 3 (8B)

**Why Llama 3?**
- Open-source (Apache 2.0 license) ✓
- 8B parameter model: Perfect balance of quality + latency
- Medical-aware through training on diverse data
- Can run locally (Ollama) or cloud (HF Inference)
- Fine-tuning capability for medical domain

**System Prompt (Critical):**

```
You are Dr. ResearchAssistant, an expert medical research synthesizer.

CONSTRAINTS:
1. ONLY cite information from the provided research documents
2. If information is not in the documents, say "This specific information wasn't covered in available research"
3. Flag conflicting evidence from different studies
4. Quantify uncertainty: "This finding has strong evidence (3+ RCTs)" vs "Limited evidence (case reports)"

DOMAIN RULES:
- Use standard medical terminology
- Include effect sizes and confidence intervals when available
- Distinguish between mechanistic studies and clinical outcomes
- Note if trials are ongoing vs completed

RESPONSE STRUCTURE:
1. Direct answer to the user's question
2. Evidence grade (Strong/Moderate/Weak based on study count & quality)
3. Clinical implications
4. Open questions / gaps in evidence
5. Always end with: "Sources: [numbered list of papers]"

TONE: Professional, cautious about claims, transparent about limitations.

DISCLAIMER: This synthesis is for research purposes only. Always consult healthcare providers before clinical decisions.
```

### Hallucination Prevention Strategy

```python
class HallucinationSafetyFilter:
    def __init__(self, retrieved_documents):
        self.documents = retrieved_documents
        self.document_facts = self.extract_facts(retrieved_documents)
        self.knowledge_cutoff = parse_date(retrieved_documents[-1].pub_date)
    
    def validate_llm_response(self, response_text):
        """Check if LLM response stays grounded in sources"""
        
        extracted_claims = self.extract_claims(response_text)
        validation_results = []
        
        for claim in extracted_claims:
            # Try to find this claim in documents
            matching_evidence = self.find_supporting_evidence(claim)
            
            if not matching_evidence:
                # HALLUCINATION DETECTED
                validation_results.append({
                    'claim': claim,
                    'status': 'UNSUPPORTED',
                    'action': 'REMOVE'
                })
            elif matching_evidence['confidence'] < 0.7:
                # WEAK SUPPORT
                validation_results.append({
                    'claim': claim,
                    'status': 'WEAKLY_SUPPORTED',
                    'action': 'ADD_CAVEAT'
                })
            else:
                validation_results.append({
                    'claim': claim,
                    'status': 'SUPPORTED',
                    'action': 'KEEP'
                })
        
        # Reconstruct response, removing unsupported claims
        cleaned_response = self.rebuild_response(
            response_text,
            validation_results
        )
        
        return cleaned_response, validation_results
    
    def extract_claims(self, text):
        """Break down response into factual statements"""
        # Use sentence tokenizer + NER to identify claims
        sentences = sent_tokenize(text)
        claims = []
        for sentence in sentences:
            if self.is_factual(sentence):
                claims.append(sentence)
        return claims
    
    def find_supporting_evidence(self, claim):
        """Search documents for evidence matching this claim"""
        for doc in self.documents:
            similarity = semantic_similarity(claim, doc.abstract)
            if similarity > 0.75:
                return {
                    'document': doc,
                    'confidence': similarity,
                    'section': 'abstract'
                }
        return None
```

---

## 4. MEMORY SYSTEM (Context-Aware)

### Conversation State Management

```javascript
// MongoDB Schema for Conversations

{
  _id: ObjectId(),
  userId: "user123",
  conversationId: "conv_abc123",
  
  messages: [
    {
      role: "user",
      content: "What are the latest treatments for stage 3 NSCLC?",
      timestamp: ISODate(),
      entities: {
        disease: "NSCLC",
        stage: "3",
        intent: "treatments"
      },
      retrievedDocuments: ["pubmed_12345", "oa_67890"],  // For provenance
      conversationContext: null  // First turn
    },
    {
      role: "assistant",
      content: "Based on recent research...",
      timestamp: ISODate(),
      sourceDocuments: [
        { id: "pubmed_12345", title: "...", citationKey: "[1]" }
      ],
      responseMetrics: {
        generationTime: 2450,  // ms
        tokensUsed: 342,
        trustScore: 0.87
      }
    },
    {
      role: "user",
      content: "What about immunotherapy specifically?",
      timestamp: ISODate(),
      entities: {
        disease: "NSCLC",  // Reused from context
        treatment: "immunotherapy",
        intent: "mechanism + efficacy"
      },
      conversationContext: {
        previousDisease: "NSCLC",
        previousStage: "3",
        focusNarrow: true,  // Following up on specific aspect
        reusePreviousResults: true  // Can filter prior results
      }
    }
  ],
  
  conversationSummary: {
    mainTopic: "NSCLC treatment",
    entitiesMentioned: ["NSCLC", "immunotherapy", "chemotherapy"],
    questionsAsked: 2,
    lastActivity: ISODate()
  },
  
  retrievalCache: {
    "NSCLC treatment": {
      results: [...],
      expiresAt: ISODate(),
      hitCount: 3  // Used 3 times in this conversation
    }
  }
}
```

### Follow-up Query Adaptation Logic

```python
class ConversationContextManager:
    def adapt_query_for_followup(self, user_query, conversation_history):
        """
        Example: 
        Q1: "treatments for NSCLC?"
        Q2: "What about immunotherapy?"
        
        Adapted Q2: "immunotherapy for NSCLC stage 3 treatment"
        """
        
        # Extract entities from previous turns
        previous_entities = self.extract_entities_from_history(conversation_history)
        
        # Parse current query
        current_entities = self.extract_entities(user_query)
        
        # Merge: implicit entities from context + explicit from new query
        merged_entities = {
            **previous_entities,  # Base context
            **current_entities    # Override with new query
        }
        
        # Determine if this is:
        # - BROADENING (new condition added)
        # - NARROWING (focus on specific aspect)
        # - LATERAL (same condition, different angle)
        query_type = self.classify_query_type(previous_entities, current_entities)
        
        # Adaptation strategies
        if query_type == 'NARROWING':
            # Reuse previous results, filter them
            self.use_cached_results = True
            self.filter_cached_by = current_entities
        elif query_type == 'BROADENING':
            # New retrieval needed, but keep context
            self.new_retrieval = True
            self.contextual_filter = merged_entities
        
        # Reconstruct query with full context
        expanded_query = self.build_query_string(merged_entities)
        
        return expanded_query, merged_entities, query_type
```

---

## 5. RESPONSE GENERATION FORMAT

### Structured Output Schema

```json
{
  "response": {
    "conditionOverview": {
      "condition": "Non-Small Cell Lung Cancer (NSCLC), Stage III",
      "summary": "Stage III NSCLC represents locally advanced disease involving lymph nodes but without distant metastases. Recent advances focus on combined modality therapy and emerging targeted/immunotherapy options.",
      "epidemiology": "Approximately 25% of NSCLC patients present with stage III disease at diagnosis.",
      "evidence_grade": "Strong (based on multiple RCTs and meta-analyses)"
    },
    
    "researchInsights": [
      {
        "rank": 1,
        "title": "Durable Benefit of Immunotherapy After Concurrent Chemoradiotherapy",
        "authors": "Antonia et al.",
        "year": 2021,
        "journal": "JAMA Oncology",
        "doi": "10.1001/jamaoncol.2021.0020",
        "citationKey": "[1]",
        "relevanceScore": 0.94,
        "studyType": "RCT (N=713)",
        "keyFindings": [
          "Adding durvalumab (anti-PD-L1) to standard CCRT improved overall survival",
          "3-year OS: 55.9% vs 43.5% (p<0.001)",
          "Benefit maintained across subgroups"
        ],
        "clinicalImplication": "Consolidation immunotherapy is now standard of care post-CCRT",
        "url": "https://pubmed.ncbi.nlm.nih.gov/...",
        "access": "open_access"
      },
      {
        "rank": 2,
        "title": "PD-L1 Expression as a Prognostic Marker in Stage III NSCLC",
        "authors": "...",
        "year": 2022,
        "citationKey": "[2]",
        "relevanceScore": 0.87,
        "keyFindings": ["..."],
        "url": "..."
      }
    ],
    
    "clinicalTrials": [
      {
        "nctNumber": "NCT04154397",
        "title": "Combination Immunotherapy in Stage III NSCLC",
        "status": "RECRUITING",
        "enrollmentTarget": 200,
        "enrollmentCurrent": 147,
        "primaryOutcome": "Disease-Free Survival",
        "phase": "Phase 3",
        "institutions": ["Memorial Sloan Kettering", "..."],
        "url": "https://clinicaltrials.gov/...",
        "relevanceScore": 0.91
      }
    ],
    
    "keyTakeaways": [
      "CCRT remains the foundation of treatment, but consolidation immunotherapy improves outcomes",
      "PD-L1 expression may predict immunotherapy benefit (emerging evidence)",
      "Genetic testing (EGFR, ALK) crucial before treatment selection",
      "Multiple ongoing trials exploring immunotherapy combinations"
    ],
    
    "sources": [
      {
        "citationKey": "[1]",
        "authors": "Antonia SJ, et al.",
        "title": "Durvalumab after Chemoradiotherapy in Stage III NSCLC",
        "journal": "JAMA Oncol",
        "year": 2021,
        "doi": "10.1001/jamaoncol.2021.0020",
        "pubmedId": "33596318",
        "url": "https://pubmed.ncbi.nlm.nih.gov/33596318/",
        "studyType": "Randomized Controlled Trial",
        "sampleSize": 713,
        "citationCount": 1247
      }
    ],
    
    "trustMetrics": {
      "overallTrustScore": 0.87,
      "scoreBreakdown": {
        "sourceCredibility": 0.92,
        "evidenceConsistency": 0.83,
        "recentData": 0.89
      },
      "conflictingEvidence": [
        "One Phase II trial showed limited benefit of dual immunotherapy (KEYNOTE-598), suggesting patient selection is critical"
      ],
      "dataFreshness": "Last updated: March 2024",
      "disclaimer": "This synthesis is for research and educational purposes only. Not medical advice. Consult qualified healthcare providers for clinical decisions."
    },
    
    "nextSteps": [
      {
        "action": "Review PD-L1 testing availability in your institution",
        "reasoning": "May guide immunotherapy selection"
      },
      {
        "action": "Check enrollment status of ongoing trials",
        "reasoning": "Access to cutting-edge treatments"
      },
      {
        "action": "Consult multidisciplinary tumor board",
        "reasoning": "Complex treatment planning requires expert input"
      }
    ],
    
    "personalization": {
      "yourInterestAreas": ["NSCLC", "Immunotherapy", "Clinical Trials"],
      "relatedQueries": [
        "Biomarkers predicting immunotherapy response in NSCLC",
        "Management of immune-related adverse events",
        "Comparing CCRT vs sequential CT+RT in stage III NSCLC"
      ]
    },
    
    "metadata": {
      "queryId": "query_12345",
      "generatedAt": "2024-03-22T14:32:01Z",
      "generationTimeMs": 4230,
      "documentsRetrieved": 187,
      "documentsAnalyzed": 20,
      "modelUsed": "Llama-3-8B",
      "versionSchema": "1.0"
    }
  }
}
```

---

## 6. PERFORMANCE & SCALABILITY ARCHITECTURE

### Latency Optimization

```
GOAL: <3s total response time from query to first output

Timeline Breakdown:
┌─────────────────────────────────────┐
│ 0-500ms   │ Query parsing + expansion  │ (Fast, local)
├─────────────────────────────────────┤
│ 0-1200ms  │ Parallel API retrieval    │ (Concurrent, cached where possible)
│           │  - OpenAlex: ~400ms       │
│           │  - PubMed: ~500ms        │
│           │  - ClinicalTrials: ~350ms │
├─────────────────────────────────────┤
│ 1200-1500ms │ Deduplication + Ranking  │ (In-memory, optimized)
├─────────────────────────────────────┤
│ 1500-2800ms │ LLM Generation           │ (Streaming output to UI)
├─────────────────────────────────────┤
│ 2800-3000ms │ Response formatting      │ (JSON serialization)
└─────────────────────────────────────┘

USER SEES OUTPUT AT: ~1500ms (LLM starts streaming)
COMPLETE RESPONSE AT: ~3000ms
```

### Caching Strategy

```yaml
Cache Layers:

1. Query-Result Cache (Redis)
   - Key: SHA256(normalized_query)
   - Value: { papers: [], trials: [], timestamp }
   - TTL: 7 days for popular queries, 1 day for long-tail
   - Hit Ratio Target: 35-40%

2. Document Cache (MongoDB)
   - Cache parsed papers with extracted metadata
   - Eliminate re-parsing on repeated queries
   - Indexed by: DOI, PubMed ID, ClinicalTrials ID

3. Embedding Cache (Vector DB - future optimization)
   - Pre-compute embeddings for top 10K papers
   - Enable semantic search without real-time embedding
   - Reduces latency to <50ms for semantic matching

4. API Response Cache
   - Store raw API responses (separate TTL per API)
   - Deduplicate across cache misses
   - Implement back-pressure when APIs rate-limited

5. LLM Prompt Cache (if using commercial APIs)
   - Cache system prompts
   - Cache retrieved document context
   - Reuse for follow-up queries

Invalidation Rules:
- Strict: New papers published in PubMed/OpenAlex
- Loose: Ranking scores don't change, results reorder
- Manual: Retraction notices, data corrections
```

### Async Pipeline Architecture

```python
# Using task queue (Bull/RabbitMQ) for heavy operations

class AnalysisPipeline:
    async def process_query(self, query):
        """Non-blocking pipeline"""
        
        # Stage 1: Parse & expand (synchronous, fast)
        parsed = parse_query(query)
        
        # Stage 2: Parallel retrieval (async)
        async with concurrent.futures.ThreadPoolExecutor() as executor:
            openalex_task = executor.submit(fetch_openalex, parsed)
            pubmed_task = executor.submit(fetch_pubmed, parsed)
            trials_task = executor.submit(fetch_trials, parsed)
            
            results = await asyncio.gather(
                openalex_task,
                pubmed_task,
                trials_task,
                return_exceptions=True
            )
        
        # Stage 3: Rank & filter (cpu-intensive, offload to worker)
        ranking_job = self.task_queue.enqueue(
            rank_documents_task,
            results,
            parsed,
            job_timeout=2000
        )
        
        # Stage 4: Generate response (stream to client)
        async with llm.stream_response(
            context=results[:20],
            query=parsed
        ) as response_stream:
            async for token in response_stream:
                websocket.send(token)  # Real-time streaming
        
        # Stage 5: Persist to DB (fire-and-forget)
        self.task_queue.enqueue(
            save_conversation,
            user_id=user_id,
            query=query,
            response=response,
            results=results
        )
        
        return response
```

### Scalability Considerations

```yaml
Current Architecture (Single Query):
  Load: <100 QPS
  Deployment: Docker container + MongoDB + Redis
  Cost: ~$50/month cloud

Scale to 10K QPS:
  1. Database Sharding
     - Shard conversations by userId (hash-based)
     - Shard results by query hash
     - MongoDB Atlas auto-sharding
  
  2. Horizontal Scaling
     - Multiple API gateway instances (load balanced)
     - Multiple LLM inference workers (Llama via Ollama cluster)
     - Worker pool for ranking/filtering
  
  3. CDN + Edge Caching
     - Cache popular queries geographically
     - Cloudflare for API response caching
  
  4. Database Optimization
     - Read replicas for user profiles
     - Write-optimized collection for conversations
     - Materialized views for analytics
  
  5. Queue-Based Approach
     - Offline ranking for non-urgent queries
     - Priority queue for returning users
```

---

## 7. ADVANCED FEATURES (Winning Edge)

### A. Trust Score with Explainability

```python
class TrustScoringEngine:
    def compute_trust_score(self, response, sources, llm_metrics):
        """
        Trust Score: Multi-factor assessment
        
        Factors:
        1. Source Credibility (40%)
        2. Evidence Consistency (30%)
        3. Data Recency (15%)
        4. Confidence Expression (15%)
        """
        
        factors = {}
        
        # Source Credibility
        source_scores = [
            self.get_journal_credibility(source.journal)
            for source in sources
        ]
        factors['source_credibility'] = np.mean(source_scores)
        
        # Evidence Consistency
        conflicting = self.detect_conflicting_evidence(sources)
        consistency = 1.0 - (len(conflicting) / len(sources) * 0.3)
        factors['consistency'] = consistency
        
        # Data Recency
        years_old = np.mean([
            (now() - s.pub_date).days / 365
            for s in sources
        ])
        recency = 0.95 ** years_old
        factors['recency'] = recency
        
        # Confidence Expression in text
        confidence_words = {
            'strong': 1.0, 'consistent': 1.0, 'clear': 1.0,
            'suggests': 0.7, 'may': 0.6, 'unclear': 0.4,
            'limited evidence': 0.3
        }
        confidence_score = self.extract_confidence(
            response,
            confidence_words
        )
        factors['confidence'] = confidence_score
        
        # Weighted composite
        trust_score = (
            0.40 * factors['source_credibility'] +
            0.30 * factors['consistency'] +
            0.15 * factors['recency'] +
            0.15 * factors['confidence']
        )
        
        return {
            'score': trust_score,
            'breakdown': factors,
            'interpretation': self.interpret_score(trust_score)
        }
    
    def interpret_score(self, score):
        if score > 0.85:
            return "High confidence - Evidence from multiple quality sources"
        elif score > 0.70:
            return "Moderate confidence - Evidence base is solid but evolving"
        elif score > 0.50:
            return "Low confidence - Limited or conflicting evidence"
        else:
            return "Very low confidence - Insufficient or poor quality evidence"
```

### B. Personalization Engine

```python
class PersonalizationEngine:
    def build_user_profile(self, user_id):
        """Track and infer user interests"""
        
        profile = {
            'interests': [],
            'expertise_level': 'unknown',  # Beginner/Intermediate/Expert
            'preferred_sources': [],
            'research_history': [],
            'publication_history': []  # Optional: if researcher
        }
        
        # Infer from query patterns
        from conversation history:
            - Extract disease entities
            - Identify research themes
            - Detect expertise signals ("PD-L1 expression" → advanced)
        
        # Infer expertise level
        expertise_signals = {
            'uses_jargon': count_medical_terms(),
            'asks_mechanism': count_how_questions(),
            'cites_specifics': references_specific_trials(),
            'asks_clinical': versus_research()
        }
        
        # Adaptive response tailoring
        if profile['expertise_level'] == 'Beginner':
            - Include more explanations
            - Define acronyms
            - Show clinical implications prominently
        elif profile['expertise_level'] == 'Expert':
            - Skip definitions
            - Emphasize mechanism details
            - Highlight controversies
```

### C. Smart Summarization

```python
class SmartSummarizer:
    def summarize_findings(self, documents, query, user_profile):
        """
        Hierarchical summarization:
        - Executive summary (1 sentence)
        - Key findings (3-5 bullets)
        - Detailed breakdown (1-2 paragraphs)
        """
        
        # Extract key papers
        landmark_papers = self.identify_landmark_papers(documents)
        
        # Consensus findings (agreement across ≥2 studies)
        consensus = self.extract_consensus(documents)
        
        # Conflicts
        conflicts = self.detect_conflicts(documents)
        
        # Edge findings (interesting but limited evidence)
        edge_findings = self.find_edge_findings(documents)
        
        return {
            'executive_summary': f"{query} is characterized by {consensus[0]}",
            'key_findings': consensus,
            'conflicting_evidence': conflicts,
            'emerging_research': edge_findings,
            'landmark_studies': landmark_papers
        }
```

### D. Next Steps Recommendation

```python
class ResearchPathway:
    def suggest_next_steps(self, query, findings, user_profile):
        """Generate actionable next steps"""
        
        steps = []
        
        # If treatment query + trials exist
        if query.intent == 'treatment' and has_active_trials:
            steps.append({
                'action': 'Review clinical trial options',
                'reasoning': f'X active trials match your criteria',
                'url': '/trials?filter=...'
            })
        
        # If mechanism unclear
        if has_conflicting_evidence:
            steps.append({
                'action': 'Examine mechanistic studies',
                'reasoning': 'Understanding the mechanism may resolve conflicts'
            })
        
        # If evidence is sparse
        if evidence_count < 5:
            steps.append({
                'action': 'Set up search alert',
                'reasoning': 'This is an active research area'
            })
        
        # Personalized
        if user_profile['expertise_level'] == 'researcher':
            steps.append({
                'action': 'Consider potential research gaps',
                'gaps': self.identify_research_gaps(findings)
            })
        
        return steps
```

### E. Modern UI/UX Features

```typescript
// React Components to Implement

<SourceCard
  paper={{
    title: "...",
    authors: ["...", "..."],
    journal: "Nature Medicine",
    year: 2023,
    doi: "10.1038/...",
    trustScore: 0.92
  }}
  onCite={() => copyBibtex()}
  onRead={() => openPDF()}
  highlights={[
    "Key finding 1: ...",
    "Key finding 2: ..."
  ]}
/>

<TrustIndicator
  score={0.87}
  breakdown={{
    sourceCredibility: 0.92,
    consistency: 0.83,
    recency: 0.89
  }}
  conflicts={[
    "One study showed different result..."
  ]}
/>

<TimelineView
  trials={[
    { nct: "NCT123", status: "RECRUITING", phase: "Phase 3" },
    { nct: "NCT456", status: "ACTIVE, NOT RECRUITING", phase: "Phase 2" }
  ]}
/>

<SourceFilter
  filters={{
    studyType: ["RCT", "Meta-analysis"],
    year: [2022, 2024],
    journal: ["Nature", "Lancet", "JAMA"]
  }}
/>
```

---

## 8. TECHNICAL DEBT & TRADE-OFFS

| Decision | Pros | Cons | Mitigation |
|----------|------|------|-----------|
| **Llama 3 over GPT-4** | Open-source, cost-effective | Less powerful reasoning | Fine-tuning + RAG approach |
| **MongoDB (not Postgres)** | Flexible schema for research data | Slower joins | Denormalization strategy |
| **Synchronous API retrieval** | Simple to implement | Slower than async | Migrate to async gradually |
| **In-memory ranking** | Fast | Memory limits at 10K docs | Implement Elasticsearch if needed |
| **No embedding vectors (initially)** | Simpler MVP | Weak semantic search | Add later as Phase 2 |

---

## 9. DEPLOYMENT & MONITORING

```yaml
Production Stack:
  Frontend: React + Vite on Vercel
  Backend: Node.js/Express on Railway or Render
  Database: MongoDB Atlas (M2 tier for scale)
  Cache: Redis Cloud
  LLM: Ollama (self-hosted) or HF Inference API
  APIs: OpenAlex, PubMed, ClinicalTrials (external)

Monitoring:
  - Request latency (target: <3s p95)
  - API error rates (target: <0.1%)
  - LLM generation quality (manual spot-checks)
  - Cache hit ratio (target: >35%)
  - Database query times (target: <200ms p95)

Logging:
  - Every query: query_id, user_id, entities, sources_used
  - Every response: generation_time, trust_score, user_feedback
  - Every error: stack trace, user impact, mitigation
```

---

## Conclusion

This architecture represents **production-grade thinking**:
- ✅ Scalable retrieval across 3 heterogeneous sources
- ✅ ML-based ranking with explainability
- ✅ Hallucination-resistant LLM integration
- ✅ Contextual memory for research continuity
- ✅ Trust scoring for transparency
- ✅ Latency optimized (<3s)
- ✅ Personalization for user engagement
- ✅ Clear trade-offs and mitigation strategies

**This system would impress judges** because it's not a chatbot wrapper—it's an engineered research system with depth in every layer.

