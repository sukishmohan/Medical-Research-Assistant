/**
 * Retrieval Service
 * 
 * Handles parallel retrieval from 3 sources:
 * - OpenAlex (academic publishing)
 * - PubMed (biomedical research)
 * - ClinicalTrials.gov (clinical trials)
 */

const axios = require('axios');
const crypto = require('crypto');

class RetrievalService {
  constructor(cache) {
    this.cache = cache;
    this.requestTimeouts = {
      openalex: 10000,
      pubmed: 15000,
      clinicaltrials: 10000
    };
  }

  /**
   * Orchestrate parallel retrieval from all sources
   */
  async retrieveFromAllSources(expandedQueries, filters = {}) {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(expandedQueries);
      const cached = await this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Parallel retrieval
      const [openalexResults, pubmedResults, trialsResults] = await Promise.all([
        this.retrieveFromOpenAlex(expandedQueries, filters).catch(err => {
          console.error('OpenAlex error:', err.message);
          return [];
        }),
        this.retrieveFromPubMed(expandedQueries, filters).catch(err => {
          console.error('PubMed error:', err.message);
          return [];
        }),
        this.retrieveFromClinicalTrials(expandedQueries, filters).catch(err => {
          console.error('ClinicalTrials error:', err.message);
          return [];
        })
      ]);

      // Combine and deduplicate
      const combined = this.combineAndDeduplicate(
        openalexResults,
        pubmedResults,
        trialsResults
      );

      // Cache the results (7-day TTL)
      await this.saveToCache(cacheKey, combined, 7 * 24 * 60 * 60);

      return combined;

    } catch (error) {
      console.error('Retrieval service error:', error);
      throw error;
    }
  }

  /**
   * Retrieve from OpenAlex
   * 
   * API: https://api.openalex.org/works
   * Coverage: 240M+ academic papers
   * Rate limit: 10,000 requests/day
   */
  async retrieveFromOpenAlex(queries, filters = {}) {
    const results = [];

    for (const query of queries.slice(0, 5)) {  // Limit to 5 queries to avoid rate limiting
      try {
        const params = {
          search: query,
          'per-page': 100,
          sort: 'cited_by_count:desc'
        };

        // Build filter string
        const filterParts = [];
        if (filters.min_year) {
          filterParts.push(`publication_year:>${filters.min_year}`);
        }
        if (filters.has_abstract) {
          filterParts.push('has_abstract:true');
        }
        if (filterParts.length > 0) {
          params.filter = filterParts.join(',');
        }

        const response = await axios.get(
          'https://api.openalex.org/works',
          { params, timeout: this.requestTimeouts.openalex }
        );

        const works = response.data.results || [];
        works.forEach(work => {
          const paper = this.parseOpenAlexWork(work);
          results.push(paper);
        });

      } catch (error) {
        console.error(`OpenAlex query failed: ${query}`, error.message);
        // Continue with next query
      }

      // Rate limiting: stagger requests
      await this.sleep(200);
    }

    return results;
  }

  /**
   * Parse OpenAlex work into normalized format
   */
  parseOpenAlexWork(work) {
    return {
      source: 'openalex',
      id: work.id,
      doi: work.doi?.replace('https://doi.org/', '') || null,
      title: work.title,
      authors: (work.authorships || []).map(a => a.author?.display_name),
      journal: work.primary_location?.source?.display_name || 'Unknown',
      publication_date: work.publication_date,
      year: work.publication_year,
      abstract: work.abstract,
      citation_count: work.cited_by_count || 0,
      open_access: work.open_access?.is_oa || false,
      pdf_url: work.open_access?.oa_url,
      url: work.landing_page_url,
      source_type: 'openalex_journal'
    };
  }

  /**
   * Retrieve from PubMed
   * 
   * API: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/
   * Coverage: 35M+ medical articles
   * Rate limit: 3 requests/second with API key
   */
  async retrieveFromPubMed(queries, filters = {}) {
    const results = [];
    const apiKey = process.env.PUBMED_API_KEY;

    for (const query of queries.slice(0, 5)) {
      try {
        // Step 1: Search (ESearch)
        const searchQuery = this.buildPubMedQuery(query, filters);
        const searchParams = {
          db: 'pubmed',
          term: searchQuery,
          retmax: 100,
          retstart: 0,
          rettype: 'json',
          ...(apiKey && { api_key: apiKey })
        };

        const searchResponse = await axios.get(
          'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
          {
            params: searchParams,
            timeout: this.requestTimeouts.pubmed,
            headers: { 'User-Agent': 'MedicalResearchAssistant/1.0' }
          }
        );

        const uids = searchResponse.data?.esearchresult?.idlist || [];

        if (uids.length > 0) {
          // Step 2: Fetch full records (EFetch)
          const fetchParams = {
            db: 'pubmed',
            id: uids.slice(0, 50).join(','),  // Fetch top 50
            rettype: 'abstract',
            retmode: 'json',
            ...(apiKey && { api_key: apiKey })
          };

          const fetchResponse = await axios.get(
            'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi',
            {
              params: fetchParams,
              timeout: this.requestTimeouts.pubmed,
              headers: { 'User-Agent': 'MedicalResearchAssistant/1.0' }
            }
          );

          const articles = fetchResponse.data?.result?.uids || [];
          articles.forEach(uid => {
            if (uid !== 'uids') {  // Skip metadata field
              const article = fetchResponse.data.result[uid];
              const paper = this.parsePubMedArticle(article);
              results.push(paper);
            }
          });
        }

      } catch (error) {
        console.error(`PubMed query failed: ${query}`, error.message);
      }

      // Rate limiting: 3 requests/second = 333ms between requests
      await this.sleep(400);
    }

    return results;
  }

  /**
   * Build advanced PubMed search query
   */
  buildPubMedQuery(query, filters = {}) {
    let q = `(${query}[Title/Abstract])`;

    if (filters.min_year) {
      q += ` AND ${filters.min_year}[PDAT]:3000[PDAT]`;
    }

    if (filters.humans_only) {
      q += ' AND humans[MeSH Terms]';
    }

    if (filters.peer_reviewed) {
      q += ' AND medline[Source]';
    }

    return q;
  }

  /**
   * Parse PubMed article into normalized format
   */
  parsePubMedArticle(article) {
    return {
      source: 'pubmed',
      id: article.uid,
      pubmed_id: article.uid,
      doi: article.doi || null,
      title: article.title,
      authors: (article.authors || []).map(a => a.name),
      journal: article.source || 'Unknown',
      publication_date: article.pubdate,
      year: parseInt(article.pubdate?.substring(0, 4)) || 0,
      abstract: article.abstract || '',
      mesh_terms: (article.mesh_headings || []).map(m => m.descriptor_name),
      article_type: article.article_types || [],
      citation_count: 0,  // PubMed doesn't provide directly
      url: `https://pubmed.ncbi.nlm.nih.gov/${article.uid}/`,
      source_type: 'pubmed_medline'
    };
  }

  /**
   * Retrieve from ClinicalTrials.gov
   * 
   * API: https://clinicaltrials.gov/api/v2
   * Coverage: 500K+ clinical trials
   * Rate limit: Generous, ~100 requests/second
   */
  async retrieveFromClinicalTrials(queries, filters = {}) {
    const results = [];

    for (const query of queries.slice(0, 5)) {
      try {
        // Extract main keyword
        const keyword = query.split(' ')[0];

        const params = {
          'query.cond': keyword,
          pageSize: 100,
          pageNumber: 1,
          sort: 'EnrollmentCount:desc'
        };

        const response = await axios.get(
          'https://clinicaltrials.gov/api/v2/studies',
          {
            params,
            timeout: this.requestTimeouts.clinicaltrials
          }
        );

        const studies = response.data?.studies || [];
        studies.forEach(study => {
          const trial = this.parseClinicalTrialsStudy(study);
          
          // Filter by active status
          if (['RECRUITING', 'ACTIVE', 'ENROLLING_BY_INVITATION'].includes(trial.status)) {
            results.push(trial);
          }
        });

      } catch (error) {
        console.error(`ClinicalTrials query failed: ${query}`, error.message);
      }

      await this.sleep(200);
    }

    return results;
  }

  /**
   * Parse ClinicalTrials.gov study into normalized format
   */
  parseClinicalTrialsStudy(study) {
    const protocol = study.protocolSection || {};
    const identification = protocol.identificationModule || {};
    const status = protocol.statusModule || {};
    const design = protocol.designModule || {};
    const conditions = protocol.conditionsModule || {};
    const armsInterventions = protocol.armsInterventionsModule || {};

    return {
      source: 'clinicaltrials',
      id: study.nctId,
      nct_id: study.nctId,
      title: identification.officialTitle || identification.briefTitle,
      status: status.overallStatus,
      phase: design.phases || [],
      enrollment: status.enrollmentInfo?.enrollmentCount || 0,
      start_date: status.startDateStruct?.date,
      completion_date: status.primaryCompletionDateStruct?.date,
      conditions: conditions.conditions || [],
      interventions: (armsInterventions.interventions || []).map(i => i.name),
      primary_outcomes: (armsInterventions.primaryOutcomes || []).map(o => o.measure),
      url: `https://clinicaltrials.gov/ct2/show/${study.nctId}`,
      source_type: 'clinical_trials'
    };
  }

  /**
   * Combine results from all sources and remove duplicates
   */
  combineAndDeduplicate(openalexResults, pubmedResults, trialsResults) {
    const seenPapers = new Set();
    const seenTrials = new Set();
    const deduplicatedPapers = [];
    const deduplicatedTrials = [];

    // Combine papers and deduplicate
    const allPapers = [...openalexResults, ...pubmedResults];
    
    allPapers.forEach(paper => {
      // Normalize title for comparison
      const titleNorm = (paper.title || '').toLowerCase().replace(/\s+/g, '');
      const key = `${titleNorm}:${paper.year || 0}`;

      if (!seenPapers.has(key)) {
        seenPapers.add(key);
        deduplicatedPapers.push(paper);
      }
    });

    // Deduplicate trials by NCT ID
    trialsResults.forEach(trial => {
      if (!seenTrials.has(trial.nct_id)) {
        seenTrials.add(trial.nct_id);
        deduplicatedTrials.push(trial);
      }
    });

    return {
      papers: deduplicatedPapers,
      trials: deduplicatedTrials,
      total_results: deduplicatedPapers.length + deduplicatedTrials.length,
      retrieval_timestamp: new Date().toISOString()
    };
  }

  /**
   * Cache operations
   */
  generateCacheKey(queries) {
    const key = queries.sort().join('|');
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  async getFromCache(key) {
    try {
      const cached = await this.cache.get(`retrieval:${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  async saveToCache(key, data, ttl) {
    try {
      await this.cache.setEx(
        `retrieval:${key}`,
        ttl,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }

  /**
   * Utility: Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = RetrievalService;
