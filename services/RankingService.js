/**
 * Ranking Service
 * 
 * ML-based document ranking combining:
 * - Relevance (BM25 + semantic similarity)
 * - Recency (publication date with citation boost)
 * - Authority (source credibility + journal impact)
 * - Clinical Significance (study type + sample size)
 */

const crypto = require('crypto');

class RankingService {
  constructor() {
    // Journal impact factors (simplified database)
    this.journalImpactFactors = {
      'Nature Medicine': 82.0,
      'Journal of Clinical Oncology': 48.0,
      'The Lancet': 202.0,
      'JAMA': 60.0,
      'New England Journal of Medicine': 96.0,
      'Nature': 64.0,
      'Science': 63.0,
      'Cell': 60.0
    };

    // Study type hierarchy
    this.studyTypeScores = {
      'rct': 1.0,
      'randomized_controlled_trial': 1.0,
      'meta_analysis': 0.95,
      'systematic_review': 0.90,
      'cohort_study': 0.70,
      'observational': 0.60,
      'case_control': 0.65,
      'case_report': 0.30,
      'editorial': 0.10
    };

    // Source credibility
    this.sourceCredibility = {
      'pubmed_medline': 1.0,
      'pubmed_pmc': 0.95,
      'clinical_trials': 0.95,
      'openalex_journal': 0.80,
      'openalex_preprint': 0.50
    };

    // Outcome keywords
    this.outcomeKeywords = [
      'mortality', 'survival', 'efficacy', 'safety',
      'biomarker', 'response rate', 'progression-free',
      'overall survival', 'adverse event'
    ];
  }

  /**
   * Main ranking function
   * Returns top 20 documents sorted by relevance
   */
  rankDocuments(documents, query, userProfile = null) {
    const scored = documents.map(doc => {
      const scores = this.computeAllScores(doc, query, userProfile);
      const finalScore = this.weightedComposite(scores);

      return {
        document: doc,
        final_score: finalScore,
        score_breakdown: scores,
        rank_position: 0  // Will be updated
      };
    });

    // Sort by final score
    scored.sort((a, b) => b.final_score - a.final_score);

    // Assign rank positions
    scored.forEach((item, index) => {
      item.rank_position = index + 1;
    });

    // Return top 20
    return scored.slice(0, 20);
  }

  /**
   * Compute all score components
   */
  computeAllScores(doc, query, userProfile = null) {
    const scores = {};

    // Relevance (35%)
    scores.relevance = this.scoreRelevance(doc, query);

    // Recency (20%)
    scores.recency = this.scoreRecency(doc);

    // Authority (25%)
    scores.authority = this.scoreAuthority(doc);

    // Clinical Significance (20%)
    scores.clinical_significance = this.scoreClinicalSignificance(doc);

    // Personalization (if user profile exists)
    if (userProfile) {
      scores.personalization_boost = this.scorePersonalization(doc, userProfile);
    }

    return scores;
  }

  /**
   * RELEVANCE SCORE (35%)
   * 
   * Components:
   * - BM25 (TF-IDF variant): 40%
   * - Semantic similarity: 30%
   * - Title match: 30%
   */
  scoreRelevance(doc, query) {
    // BM25-like scoring (simplified)
    const titleWords = (doc.title || '').toLowerCase().split(/\W+/);
    const queryWords = query.toLowerCase().split(/\W+/);
    const abstract = (doc.abstract || '').toLowerCase();

    // Term frequency
    let bm25Score = 0;
    queryWords.forEach(qWord => {
      const titleMatches = titleWords.filter(w => w === qWord).length;
      const abstractMatches = (abstract.match(new RegExp(qWord, 'g')) || []).length;
      bm25Score += (titleMatches * 2 + abstractMatches) / (titleWords.length + abstract.split(/\W+/).length);
    });
    bm25Score = Math.min(bm25Score / queryWords.length, 1.0);

    // Semantic similarity (simplified: keyword overlap)
    const titleOverlap = titleWords.filter(w => queryWords.includes(w)).length / titleWords.length;

    // Title match (highest weight)
    const queryTermsInTitle = queryWords.filter(w => titleWords.includes(w)).length / queryWords.length;

    const relevance = (
      0.40 * bm25Score +
      0.30 * titleOverlap +
      0.30 * queryTermsInTitle
    );

    return Math.min(relevance, 1.0);
  }

  /**
   * RECENCY SCORE (20%)
   * 
   * Strategy:
   * - Exponential decay: 0.95^years_old
   * - Boost for high-citation papers
   */
  scoreRecency(doc) {
    if (!doc.publication_date && !doc.year) {
      return 0.5;  // Unknown date = moderate score
    }

    const pubDate = new Date(doc.publication_date || `${doc.year}-01-01`);
    const now = new Date();
    const yearsOld = (now - pubDate) / (365.25 * 24 * 60 * 60 * 1000);

    // Exponential decay
    const decayFactor = Math.pow(0.95, Math.max(0, yearsOld));

    // Boost for landmark papers
    const citationBoost = Math.min((doc.citation_count || 0) / 2000, 0.3);

    const recency = Math.min(decayFactor + citationBoost, 1.0);

    return recency;
  }

  /**
   * AUTHORITY SCORE (25%)
   * 
   * Components:
   * - Source credibility: 50%
   * - Journal impact factor: 30%
   * - Peer review status: 20%
   */
  scoreAuthority(doc) {
    // Source credibility
    const sourceScore = this.sourceCredibility[doc.source_type] || 0.6;

    // Journal impact factor
    let ifScore = 0.0;
    if (doc.journal) {
      const impactFactor = this.journalImpactFactors[doc.journal] || 3.0;
      ifScore = Math.min(impactFactor / 10, 1.0);
    }

    // Peer review status
    const peerReviewScore = doc.peer_reviewed !== false ? 1.0 : 0.5;

    const authority = (
      0.50 * sourceScore +
      0.30 * ifScore +
      0.20 * peerReviewScore
    );

    return authority;
  }

  /**
   * CLINICAL SIGNIFICANCE SCORE (20%)
   * 
   * Components:
   * - Study type: 50%
   * - Sample size: 30%
   * - Outcome relevance: 20%
   */
  scoreClinicalSignificance(doc) {
    // Study type hierarchy
    const studyType = (doc.article_type?.[0] || 'unknown').toLowerCase();
    let studyTypeScore = 0.4;
    
    for (const [type, score] of Object.entries(this.studyTypeScores)) {
      if (studyType.includes(type)) {
        studyTypeScore = score;
        break;
      }
    }

    // Sample size (log scale)
    const sampleSize = doc.sample_size || doc.enrollment || 1;
    const sampleScore = Math.min(Math.log10(Math.max(sampleSize, 1)) / 4, 1.0);

    // Outcome relevance
    const abstract = (doc.abstract || '').toLowerCase();
    const outcomesPresent = this.outcomeKeywords.some(kw => abstract.includes(kw));
    const outcomeScore = outcomesPresent ? 1.0 : 0.5;

    const clinicalSig = (
      0.50 * studyTypeScore +
      0.30 * sampleScore +
      0.20 * outcomeScore
    );

    return clinicalSig;
  }

  /**
   * PERSONALIZATION BOOST
   * 
   * Returns boost factor (additional score)
   */
  scorePersonalization(doc, userProfile) {
    let boost = 0.0;

    if (!userProfile) return boost;

    // Match disease interests
    const title = (doc.title || '').toLowerCase();
    const abstract = (doc.abstract || '').toLowerCase();

    if (userProfile.interests) {
      userProfile.interests.forEach(interest => {
        if (title.includes(interest.toLowerCase())) boost += 0.05;
        if (abstract.includes(interest.toLowerCase())) boost += 0.02;
      });
    }

    // Match research areas
    if (userProfile.research_areas) {
      userProfile.research_areas.forEach(area => {
        if (abstract.includes(area.toLowerCase())) boost += 0.05;
      });
    }

    // Match preferred sources
    if (userProfile.preferred_sources) {
      if (userProfile.preferred_sources.includes(doc.source_type)) {
        boost += 0.03;
      }
    }

    return Math.min(boost, 0.2);  // Cap at 20%
  }

  /**
   * Weighted composite score
   * 
   * Final Score = 0.35*Relevance + 0.20*Recency + 0.25*Authority + 0.20*ClinicalSig
   */
  weightedComposite(scores) {
    const weights = {
      relevance: 0.35,
      recency: 0.20,
      authority: 0.25,
      clinical_significance: 0.20
    };

    let baseScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
      baseScore += (scores[key] || 0) * weight;
    }

    // Apply personalization boost
    if (scores.personalization_boost) {
      baseScore *= (1.0 + scores.personalization_boost);
    }

    return Math.min(baseScore, 1.0);
  }

  /**
   * Generate ranking explanation
   */
  generateRankingExplanation(scores) {
    const factors = [];

    if (scores.relevance > 0.8) {
      factors.push('High relevance to query');
    }

    if (scores.recency > 0.8) {
      factors.push('Recent research');
    } else if (scores.recency > 0.6 && scores.score_breakdown?.citation_count > 500) {
      factors.push('Landmark paper (highly cited)');
    }

    if (scores.authority > 0.8) {
      factors.push('Credible source (top-tier journal)');
    }

    if (scores.clinical_significance > 0.8) {
      factors.push('Strong clinical significance (RCT with outcomes)');
    }

    return factors.join(' | ');
  }
}

module.exports = RankingService;
