# 🤖 LLM INTEGRATION & RANKING ALGORITHMS

## 1. LLM MODEL SELECTION & SETUP

### Why Llama 3 (8B)?

| Criterion | Llama 3 8B | GPT-4 | Claude 3.5 |
|-----------|-----------|-------|-----------|
| **Cost** | $0 (open-source) | $0.03/1K input | $0.003/1K input |
| **Latency** | 50-200ms/token | 200-500ms | 150-400ms |
| **Hallucination** | Moderate (RAG helps) | Low | Very Low |
| **Medical Knowledge** | Good (general training) | Excellent | Excellent |
| **Deployment** | Self-hosted or HF | API only | API only |
| **License** | Apache 2.0 | Proprietary | Proprietary |
| **Fine-tuning** | Yes (possible) | Expensive | Limited |

**Selection**: Llama 3 8B because:
1. **Open-source**: No API costs, full control
2. **Fast enough**: 8B parameter model hits <200ms latency sweet spot
3. **Good quality**: Trained on 15T tokens, competitive with GPT-3.5
4. **Production-ready**: Proven in many healthcare applications
5. **Compliance**: Can be self-hosted (HIPAA-relevant for medical use)

---

## 2. PROMPT ENGINEERING STRATEGY

### System Prompt (Critical)

```
You are an expert medical research synthesizer. Your role is to:

1. SYNTHESIS: Summarize findings from peer-reviewed research papers
2. GROUNDING: Only cite information explicitly stated in provided documents
3. HONESTY: Explicitly state when evidence is limited or conflicting
4. CLARITY: Use clear, professional medical language

STRICT RULES:
- If information is NOT in the provided documents, DO NOT mention it
- If conflicting evidence exists, highlight ALL viewpoints
- Quantify certainty: "Strong evidence (5+ RCTs)" vs "Limited (case reports)"
- Flag outdated information: "This approach was standard in 2015 but has been superseded"
- Always include: Evidence level, Number of studies, Study types

RESPONSE STRUCTURE:
1. Answer question directly (1-2 sentences)
2. Supporting evidence (cite specific studies with [Author, Year])
3. Magnitude of effect (absolute numbers, not just p-values)
4. Clinical implications (so what?)
5. Uncertainties or gaps (what we don't know)
6. End with complete source list

TONE: Professional, cautious about causation, transparent about study quality
DISCLAIMER: This is educational content only. Not medical advice.
```

### Context Injection Template

```
CONVERSATION CONTEXT (if follow-up query):
- Previous question: {previous_query}
- Key entities established: {entities}
- Documents used before: {previous_doc_ids}

RETRIEVED DOCUMENTS:
{formatted_documents}

USER QUERY:
{user_query}

INSTRUCTIONS:
- Build on previous discussion if applicable
- Reference prior findings: "As discussed earlier..."
- Stay focused on NEW aspects in this query
- Maintain conversation coherence
```

---

## 3. HALLUCINATION PREVENTION

### Multi-Layer Defense

```python
class HallucinationDetector:
    """
    Multi-layer strategy to prevent LLM from fabricating information
    """
    
    def __init__(self, retrieved_documents: List[Dict]):
        self.documents = retrieved_documents
        self.document_embeddings = self.embed_documents()
        self.extract_facts()
    
    def validate_response(self, llm_response: str) -> Dict:
        """
        Check if LLM response is grounded in retrieved documents
        Return: {response, validation_results, confidence_score}
        """
        
        # Break response into atomic claims
        claims = self.extract_claims(llm_response)
        
        validation = {
            'total_claims': len(claims),
            'supported_claims': 0,
            'unsupported_claims': [],
            'weakly_supported_claims': [],
            'issues': []
        }
        
        for claim in claims:
            evidence = self.find_evidence(claim)
            
            if evidence['found'] and evidence['confidence'] > 0.8:
                validation['supported_claims'] += 1
            elif evidence['found'] and evidence['confidence'] > 0.5:
                validation['weakly_supported_claims'].append({
                    'claim': claim,
                    'confidence': evidence['confidence'],
                    'source': evidence['source']
                })
            else:
                validation['unsupported_claims'].append({
                    'claim': claim,
                    'action': 'REMOVE'
                })
        
        # Calculate overall confidence
        support_ratio = validation['supported_claims'] / len(claims) if claims else 1.0
        validation['confidence_score'] = support_ratio
        
        return validation
    
    def find_evidence(self, claim: str) -> Dict:
        """
        Search documents for evidence matching this claim
        Uses semantic similarity + keyword matching
        """
        
        best_match = {
            'found': False,
            'confidence': 0.0,
            'source': None
        }
        
        claim_embedding = self.embedding_model.encode(claim)
        
        for doc in self.documents:
            # Semantic similarity
            doc_embedding = self.document_embeddings[doc['id']]
            similarity = cosine_similarity(claim_embedding, doc_embedding)
            
            # Keyword matching (backup)
            claim_keywords = set(claim.lower().split())
            doc_keywords = set(doc['abstract'].lower().split())
            keyword_overlap = len(claim_keywords & doc_keywords) / len(claim_keywords)
            
            # Combined confidence
            confidence = 0.6 * similarity + 0.4 * keyword_overlap
            
            if confidence > best_match['confidence']:
                best_match = {
                    'found': confidence > 0.6,
                    'confidence': confidence,
                    'source': doc['id']
                }
        
        return best_match
    
    def extract_claims(self, text: str) -> List[str]:
        """
        Break response into factual statements
        Not all sentences are claims (e.g., "This is interesting" is not a claim)
        """
        
        sentences = sent_tokenize(text)
        claims = []
        
        for sentence in sentences:
            if self.is_factual_claim(sentence):
                claims.append(sentence.strip())
        
        return claims
    
    def is_factual_claim(self, sentence: str) -> bool:
        """
        Filter out non-factual statements
        Examples:
        - Factual: "The study found X patients had Y outcome"
        - Non-factual: "This is interesting" / "We should consider..."
        """
        
        non_factual_patterns = [
            r"^I\s+(think|believe|suggest)",
            r"^This\s+(is\s+)?(interesting|important|notable)",
            r"^(However|Therefore|Thus)",
            r"^(We\s+should|One\s+could|It\s+may\s+be)"
        ]
        
        for pattern in non_factual_patterns:
            if re.match(pattern, sentence, re.IGNORECASE):
                return False
        
        return True
```

### Prevention Strategy

```
Layer 1: RETRIEVAL
- Only provide top-20 most relevant documents to LLM
- Filter out low-quality sources before retrieval
- Include document metadata (journal, year, quality score)

Layer 2: PROMPT ENGINEERING
- Explicit instruction: "Only cite provided documents"
- Chain-of-thought: "Let me check each document for this claim..."
- Penalty signal: "Do NOT invent or assume information"

Layer 3: RAG ENFORCEMENT
- Constrain LLM vocabulary to document entities
- Use template-based generation for structured fields
- Limit response length (prevents over-elaboration)

Layer 4: POST-GENERATION VALIDATION
- Check every factual claim against documents
- Remove unsupported claims
- Flag weak evidence with caveats

Layer 5: HUMAN-IN-THE-LOOP
- Flag high-uncertainty responses (confidence < 0.7)
- Require expert review for medical claims
- Implement feedback loop to improve over time
```

---

## 4. RANKING ALGORITHM (ML-BASED)

### Comprehensive Scoring System

```python
import numpy as np
from sklearn.preprocessing import MinMaxScaler

class DocumentRanker:
    """
    Multi-factor ranking combining relevance, authority, recency, clinical significance
    """
    
    def __init__(self):
        self.bm25_ranker = BM25Ranker()  # TF-IDF variant
        self.embedding_model = SentenceTransformer("PubMedBERT")
        self.journal_impact_db = JournalMetrics()  # Precomputed IF scores
        self.citation_database = CrossRefAPI()  # Real-time citation counts
        self.scaler = MinMaxScaler(feature_range=(0, 1))
    
    def rank_documents(
        self,
        documents: List[Dict],
        query: str,
        user_profile: Dict = None
    ) -> List[Dict]:
        """
        Score and rank documents using multi-factor algorithm
        Returns top-20 by relevance for LLM context window
        """
        
        scored_docs = []
        
        for doc in documents:
            scores = self.compute_all_scores(doc, query, user_profile)
            final_score = self.weighted_composite(scores)
            
            scored_docs.append({
                'document': doc,
                'final_score': final_score,
                'score_breakdown': scores
            })
        
        # Sort by final score, return top 20
        ranked = sorted(
            scored_docs,
            key=lambda x: x['final_score'],
            reverse=True
        )[:20]
        
        return ranked
    
    def compute_all_scores(
        self,
        doc: Dict,
        query: str,
        user_profile: Dict = None
    ) -> Dict:
        """Compute individual score components"""
        
        scores = {}
        
        # RELEVANCE SCORE (35% weight)
        scores['relevance'] = self.score_relevance(doc, query)
        
        # RECENCY SCORE (20% weight)
        scores['recency'] = self.score_recency(doc)
        
        # AUTHORITY SCORE (25% weight)
        scores['authority'] = self.score_authority(doc)
        
        # CLINICAL SIGNIFICANCE (20% weight)
        scores['clinical_significance'] = self.score_clinical_significance(doc)
        
        # PERSONALIZATION BOOST (if user profile available)
        if user_profile:
            scores['personalization_boost'] = self.score_personalization(
                doc, user_profile
            )
        
        return scores
    
    def score_relevance(self, doc: Dict, query: str) -> float:
        """
        Relevance: Is this document about the right topic?
        
        Components:
        1. BM25 (TF-IDF variant) - 40% weight
        2. Semantic similarity (embeddings) - 30% weight
        3. Title match - 30% weight
        """
        
        # BM25 Score (0-1 normalized)
        bm25_score = self.bm25_ranker.score(
            document=doc['abstract'] + ' ' + doc['title'],
            query=query
        )
        bm25_score = min(bm25_score / 50, 1.0)  # Normalize (50 is typical max)
        
        # Semantic similarity (embeddings)
        query_embedding = self.embedding_model.encode(query)
        doc_embedding = self.embedding_model.encode(
            doc['title'] + ' ' + doc['abstract']
        )
        semantic_score = cosine_similarity(query_embedding, doc_embedding)
        
        # Title match (highest weight)
        title_words = set(query.lower().split())
        doc_title_words = set(doc['title'].lower().split())
        title_overlap = len(title_words & doc_title_words) / len(title_words)
        
        # Weighted combination
        relevance = (
            0.40 * bm25_score +
            0.30 * semantic_score +
            0.30 * title_overlap
        )
        
        return min(relevance, 1.0)
    
    def score_recency(self, doc: Dict) -> float:
        """
        Recency: Is this recent research?
        
        Strategy:
        - Papers from last 2 years: High score
        - Exponential decay: 0.95^(years_old)
        - Landmark papers (high citations): Boost older papers
        """
        
        pub_date = parse_date(doc['publication_date'])
        years_old = (datetime.now() - pub_date).days / 365.25
        
        # Base recency score (exponential decay)
        decay_factor = 0.95 ** max(0, years_old)
        
        # Boost for landmark papers (high citation count)
        citation_boost = 0.0
        if doc['citation_count'] > 500:  # High-impact threshold
            citation_boost = min(doc['citation_count'] / 2000, 0.3)
        
        recency = min(decay_factor + citation_boost, 1.0)
        
        return recency
    
    def score_authority(self, doc: Dict) -> float:
        """
        Authority: How trustworthy is the source?
        
        Components:
        1. Source credibility (PubMed > OpenAlex journal > preprint) - 50%
        2. Journal impact factor - 30%
        3. Peer review status - 20%
        """
        
        # Source credibility scores
        source_scores = {
            'pubmed_medline': 1.0,
            'pubmed_pmc': 0.95,
            'clinical_trials': 0.95,
            'openalex_journal': 0.80,
            'openalex_preprint': 0.50
        }
        source_score = source_scores.get(doc['source_type'], 0.6)
        
        # Journal impact factor (normalized)
        if_score = 0.0
        if journal_if := self.journal_impact_db.get_impact_factor(doc['journal']):
            # Normalize IF (typical range 1-50, max 100)
            if_score = min(journal_if / 10, 1.0)
        
        # Peer review status
        peer_review_score = 1.0 if doc.get('peer_reviewed', True) else 0.5
        
        authority = (
            0.50 * source_score +
            0.30 * if_score +
            0.20 * peer_review_score
        )
        
        return authority
    
    def score_clinical_significance(self, doc: Dict) -> float:
        """
        Clinical Significance: Does this study matter?
        
        Components:
        1. Study type (RCT > meta-analysis > observational > case report) - 50%
        2. Sample size (larger better, with diminishing returns) - 30%
        3. Outcome relevance (mortality > morbidity > surrogate) - 20%
        """
        
        # Study type hierarchy
        study_type_scores = {
            'rct': 1.0,
            'randomized_controlled_trial': 1.0,
            'meta_analysis': 0.95,
            'systematic_review': 0.90,
            'cohort_study': 0.70,
            'observational': 0.60,
            'case_control': 0.65,
            'case_report': 0.30,
            'editorial': 0.10
        }
        study_type = doc.get('study_type', 'unknown').lower()
        study_type_score = study_type_scores.get(study_type, 0.4)
        
        # Sample size (log scale, diminishing returns)
        sample_size = doc.get('sample_size', 1)
        sample_score = min(np.log10(max(sample_size, 1)) / 4, 1.0)
        # log10(10) / 4 = 0.25, log10(100) / 4 = 0.5, log10(10000) / 4 = 1.0
        
        # Outcome relevance (check abstract for keywords)
        outcome_keywords = ['mortality', 'survival', 'efficacy', 'safety', 'biomarker']
        outcomes_present = any(
            kw in doc.get('abstract', '').lower()
            for kw in outcome_keywords
        )
        outcome_score = 1.0 if outcomes_present else 0.5
        
        clinical_sig = (
            0.50 * study_type_score +
            0.30 * sample_score +
            0.20 * outcome_score
        )
        
        return clinical_sig
    
    def score_personalization(self, doc: Dict, user_profile: Dict) -> float:
        """
        Personalization: Does this match user's interests?
        
        Returns a boost factor (1.0 = no boost, 1.2 = 20% boost)
        """
        
        boost = 1.0
        
        # Match disease interests
        if any(
            interest.lower() in doc['title'].lower()
            for interest in user_profile.get('interests', [])
        ):
            boost *= 1.05
        
        # Match research areas
        if any(
            area.lower() in doc['abstract'].lower()
            for area in user_profile.get('research_areas', [])
        ):
            boost *= 1.05
        
        # Match preferred sources
        if doc['source_type'] in user_profile.get('preferred_sources', []):
            boost *= 1.03
        
        return min(boost - 1.0, 0.2)  # Cap boost at 20%
    
    def weighted_composite(self, scores: Dict) -> float:
        """
        Combine all scores with weights
        Total weight = 1.0
        """
        
        weights = {
            'relevance': 0.35,
            'recency': 0.20,
            'authority': 0.25,
            'clinical_significance': 0.20
        }
        
        base_score = sum(
            scores[key] * weight
            for key, weight in weights.items()
        )
        
        # Apply personalization boost (if exists)
        if 'personalization_boost' in scores:
            base_score *= (1.0 + scores['personalization_boost'])
        
        return min(base_score, 1.0)
```

---

## 5. EXAMPLE RANKING OUTPUT

```json
{
  "document": {
    "id": "pubmed_12345",
    "title": "Immunotherapy in Advanced NSCLC: 5-Year Follow-up",
    "authors": ["Smith J.", "Johnson M.", "..."],
    "journal": "Journal of Clinical Oncology",
    "year": 2023,
    "citation_count": 847
  },
  "final_score": 0.92,
  "score_breakdown": {
    "relevance": {
      "bm25": 0.85,
      "semantic": 0.91,
      "title_match": 0.88,
      "combined": 0.88
    },
    "recency": {
      "base": 0.87,
      "citation_boost": 0.05,
      "final": 0.92
    },
    "authority": {
      "source": 1.0,
      "journal_if": 0.85,
      "peer_reviewed": 1.0,
      "combined": 0.92
    },
    "clinical_significance": {
      "study_type": 1.0,
      "sample_size": 0.95,
      "outcomes": 1.0,
      "combined": 0.98
    },
    "personalization_boost": 0.05
  },
  "reasoning": "High relevance (title match + semantic), recent with many citations, top-tier journal, RCT with strong outcomes"
}
```

---

## 6. A/B TESTING & OPTIMIZATION

Monitor ranking effectiveness:

```python
class RankingMetrics:
    """Track ranking quality over time"""
    
    def measure_ranking_quality(self, ranking: List[Dict], user_feedback: Dict):
        """
        user_feedback: {
            'clicked_docs': [...],  # Which docs user clicked
            'dwell_time': {...},    # Time spent on each doc
            'query_reformulation': bool,  # Did they re-query?
            'helpful': bool,        # Explicit rating
            'rating': 1-5           # Numeric rating
        }
        """
        
        metrics = {
            'click_through_rate': len(user_feedback['clicked_docs']) / len(ranking),
            'avg_dwell_time': np.mean(user_feedback['dwell_time'].values()),
            'top_5_click_rate': sum(
                1 for doc in user_feedback['clicked_docs']
                if ranking.index(doc) < 5
            ) / 5,
            'ndcg': self.compute_ndcg(ranking, user_feedback),
            'query_reformulation': user_feedback['query_reformulation']
        }
        
        return metrics
    
    def compute_ndcg(self, ranking: List[Dict], feedback: Dict) -> float:
        """Normalized Discounted Cumulative Gain"""
        # Industry standard metric for ranking quality
        pass
```

---

## Summary

This ranking system:
✅ Combines 4 major factors (relevance, recency, authority, clinical significance)
✅ Uses both traditional (BM25) and modern (embeddings) IR techniques
✅ Personalizes based on user interests
✅ Prevents garbage-in/garbage-out (filters before LLM)
✅ Measurable and optimizable with feedback loops

