/**
 * Query Understanding Service
 * 
 * Responsibilities:
 * - Parse user queries
 * - Extract medical entities
 * - Classify research intent
 * - Extract temporal constraints
 * - Adapt queries based on conversation context
 */

const { DateTime } = require('date-fns');

class QueryUnderstandingService {
  constructor() {
    this.intents = {
      'treatment': ['treat', 'therapy', 'management', 'drug', 'cure', 'medication'],
      'diagnosis': ['diagnose', 'screening', 'detect', 'identify', 'criteria', 'tests'],
      'prognosis': ['prognosis', 'outcome', 'survival', 'recovery', 'long-term'],
      'mechanism': ['mechanism', 'cause', 'pathophysiology', 'why', 'how'],
      'epidemiology': ['prevalence', 'incidence', 'epidemiology', 'rate', 'frequency'],
      'prevention': ['prevent', 'prevention', 'risk factor', 'prophylaxis'],
      'adverse': ['side effect', 'adverse', 'toxicity', 'complication']
    };

    this.temporalPatterns = {
      'recent': /recent|latest|new|2024|2023|last\s+\d+\s+years?/i,
      'landmark': /landmark|classic|seminal|all-time/i,
      'specific_year': /\b(19|20)\d{2}\b/,
      'era': /pre-2010|2010-2015|modern|historical/i
    };

    // Medical dictionary (simplified)
    this.medicalSynonyms = {
      'MI': 'myocardial infarction',
      'NSCLC': 'non-small cell lung cancer',
      'DM': 'diabetes mellitus',
      'HTN': 'hypertension',
      'CHF': 'congestive heart failure',
      'CVD': 'cardiovascular disease',
      'ICD': 'implicit cardioverter defibrillator',
      'RCT': 'randomized controlled trial'
    };

    this.relatedConditions = {
      'diabetes': ['metabolic syndrome', 'obesity', 'cardiovascular disease'],
      'NSCLC': ['adenocarcinoma', 'squamous cell carcinoma', 'lung cancer'],
      'heart failure': ['cardiomyopathy', 'hypertension', 'coronary artery disease']
    };
  }

  /**
   * Main parsing function
   */
  parseQuery(userQuery, conversationContext = null) {
    const parsed = {
      original_query: userQuery,
      processed_at: new Date().toISOString(),
      entities: this.extractEntities(userQuery),
      intent: this.classifyIntent(userQuery),
      temporal: this.extractTemporal(userQuery)
    };

    // Adapt with conversation context if available
    if (conversationContext) {
      parsed.context_adapted = this.adaptWithContext(
        parsed,
        conversationContext
      );
    }

    // Calculate confidence
    parsed.confidence = this.calculateConfidence(parsed);

    return parsed;
  }

  /**
   * Extract medical entities from query
   */
  extractEntities(query) {
    const entities = {
      diseases: [],
      treatments: [],
      procedures: [],
      medications: [],
      demographics: [],
      staging: []
    };

    const queryLower = query.toLowerCase();

    // Expand acronyms
    for (const [acronym, fullName] of Object.entries(this.medicalSynonyms)) {
      if (queryLower.includes(acronym.toLowerCase())) {
        entities.diseases.push({
          text: fullName,
          original: acronym,
          confidence: 0.9
        });
      }
    }

    // Extract staging information (stage 1-4, stage I-IV)
    const stageMatch = query.match(/stage\s+([1-4]|[IVX]+|III)/i);
    if (stageMatch) {
      entities.staging.push({
        text: stageMatch[0],
        value: stageMatch[1],
        confidence: 0.95
      });
    }

    // Extract age demographics
    const ageMatch = query.match(/(\d+)[-\s]*(year|yr)[-\s]*old/i);
    if (ageMatch) {
      entities.demographics.push({
        type: 'age',
        value: ageMatch[1],
        confidence: 0.9
      });
    }

    // Simple keyword matching for treatments
    const treatmentKeywords = ['chemotherapy', 'immunotherapy', 'radiation', 'surgery', 'hormone therapy'];
    treatmentKeywords.forEach(kw => {
      if (queryLower.includes(kw)) {
        entities.treatments.push({
          text: kw,
          confidence: 0.85
        });
      }
    });

    return entities;
  }

  /**
   * Classify research intent
   */
  classifyIntent(query) {
    const queryLower = query.toLowerCase();
    const intentScores = {};

    for (const [intent, keywords] of Object.entries(this.intents)) {
      const score = keywords.filter(kw => queryLower.includes(kw)).length;
      intentScores[intent] = score;
    }

    const maxScore = Math.max(...Object.values(intentScores));
    if (maxScore === 0) return 'general';

    return Object.keys(intentScores).find(
      intent => intentScores[intent] === maxScore
    );
  }

  /**
   * Extract temporal constraints
   */
  extractTemporal(query) {
    for (const [temporalType, pattern] of Object.entries(this.temporalPatterns)) {
      if (pattern.test(query)) {
        return {
          type: temporalType,
          constraint: this.temporalToFilter(temporalType)
        };
      }
    }
    return null;
  }

  /**
   * Convert temporal type to MongoDB filter
   */
  temporalToFilter(temporalType) {
    const now = new Date();

    switch (temporalType) {
      case 'recent':
        const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
        return { publication_date: { $gte: twoYearsAgo } };
      
      case 'landmark':
        return {};  // No filter

      case 'specific_year':
        // Would need to extract the year from the query
        return {};

      case 'era':
        const eraStart = new Date(2010, 0, 1);
        return { publication_date: { $gte: eraStart } };

      default:
        return {};
    }
  }

  /**
   * Adapt query based on conversation context
   */
  adaptWithContext(parsedQuery, conversationContext) {
    const previousEntities = conversationContext.previousEntities || {};

    const mergedEntities = {
      ...previousEntities,
      ...parsedQuery.entities
    };

    const queryType = this.classifyQueryType(previousEntities, parsedQuery.entities);

    return {
      query_type: queryType,
      merged_entities: mergedEntities,
      reuse_previous_results: queryType === 'narrowing',
      cache_key: this.generateCacheKey(mergedEntities)
    };
  }

  /**
   * Classify whether query is broadening, narrowing, or lateral
   */
  classifyQueryType(previousEntities, currentEntities) {
    const prevDiseases = (previousEntities.diseases || []).map(d => d.text || d);
    const currDiseases = (currentEntities.diseases || []).map(d => d.text);

    // If diseases are same, it's narrowing or lateral
    if (JSON.stringify(prevDiseases) === JSON.stringify(currDiseases)) {
      return 'narrowing';
    }

    // If new diseases added, it's broadening
    if (currDiseases.length > prevDiseases.length) {
      return 'broadening';
    }

    return 'lateral';
  }

  /**
   * Calculate parsing confidence
   */
  calculateConfidence(parsedQuery) {
    let score = 0;

    if (parsedQuery.entities.diseases.length > 0) score += 0.3;
    if (parsedQuery.intent) score += 0.4;
    if (parsedQuery.temporal) score += 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Generate cache key for query
   */
  generateCacheKey(entities) {
    const key = [
      entities.diseases?.map(d => d.text || d).join('|'),
      entities.treatments?.map(t => t.text).join('|'),
      entities.staging?.map(s => s.value).join('|')
    ]
      .filter(Boolean)
      .join('::');

    return require('crypto')
      .createHash('sha256')
      .update(key)
      .digest('hex');
  }

  /**
   * Expand query into multiple variants for multi-source retrieval
   */
  expandQuery(parsedQuery) {
    const expansions = new Set();

    // Add original query
    expansions.add(parsedQuery.original_query);

    // Expand diseases
    parsedQuery.entities.diseases.forEach(disease => {
      const diseaseText = disease.text || disease;
      
      // With intent keywords
      const intentKeywords = this.intents[parsedQuery.intent] || [];
      intentKeywords.slice(0, 2).forEach(kw => {
        expansions.add(`${diseaseText} ${kw}`);
      });

      // With staging
      if (parsedQuery.entities.staging.length > 0) {
        parsedQuery.entities.staging.forEach(stage => {
          expansions.add(`${diseaseText} ${stage.text}`);
        });
      }

      // With related conditions
      const relatedList = this.relatedConditions[diseaseText.toLowerCase()] || [];
      relatedList.slice(0, 2).forEach(related => {
        expansions.add(`${diseaseText} ${related}`);
      });
    });

    // Add study type modifiers
    ['randomized controlled trial', 'meta-analysis', 'clinical trial'].forEach(study => {
      const topQueries = Array.from(expansions).slice(0, 2);
      topQueries.forEach(query => {
        expansions.add(`${query} ${study}`);
      });
    });

    // Remove empty and short queries
    return Array.from(expansions)
      .filter(q => q.trim().length > 0 && q.split(' ').length >= 2)
      .slice(0, 12);  // Limit to 12 queries
  }
}

module.exports = QueryUnderstandingService;
