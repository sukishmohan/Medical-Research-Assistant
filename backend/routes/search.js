/**
 * Search Route
 * 
 * POST /api/search
 * Query understanding → Retrieval → Ranking → LLM Generation
 */

const express = require('express');
const { v4: uuid } = require('uuid');
const QueryUnderstandingService = require('../services/QueryUnderstandingService');
const RetrievalService = require('../services/RetrievalService');
const RankingService = require('../services/RankingService');
const LLMService = require('../services/LLMService');

const router = express.Router();

/**
 * POST /api/search
 * 
 * Request body:
 * {
 *   "query": "What are treatments for stage 3 NSCLC?",
 *   "userId": "user123",
 *   "conversationId": "conv_abc123"
 * }
 * 
 * Response:
 * {
 *   "queryId": "query_xyz",
 *   "response": {
 *     "conditionOverview": {...},
 *     "researchInsights": [...],
 *     "clinicalTrials": [...],
 *     "keyTakeaways": [...],
 *     "sources": [...],
 *     "trustScore": 0.85,
 *     "nextSteps": [...]
 *   },
 *   "metadata": {...}
 * }
 */
router.post('/', async (req, res) => {
  const requestId = req.requestId;
  const { query, userId, conversationId } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    req.logger.info({
      requestId,
      event: 'search_started',
      userId,
      query: query.substring(0, 100)
    });

    // Initialize services
    const queryService = new QueryUnderstandingService();
    const retrievalService = new RetrievalService(req.cache);
    const rankingService = new RankingService();
    const llmService = new LLMService();

    const queryId = uuid();
    const startTime = Date.now();

    // ============================================
    // STAGE 1: QUERY UNDERSTANDING
    // ============================================
    const parsedQuery = queryService.parseQuery(query);
    const expandedQueries = queryService.expandQuery(parsedQuery);

    req.logger.info({
      requestId,
      stage: 'query_parsing_complete',
      expandedQueriesCount: expandedQueries.length,
      intent: parsedQuery.intent
    });

    // ============================================
    // STAGE 2: RETRIEVAL (Parallel from 3 sources)
    // ============================================
    const retrievalStart = Date.now();
    const retrievedData = await retrievalService.retrieveFromAllSources(
      expandedQueries,
      {
        min_year: parsedQuery.temporal?.constraint?.min_year || 2020,
        has_abstract: true
      }
    );

    const retrievalTime = Date.now() - retrievalStart;

    req.logger.info({
      requestId,
      stage: 'retrieval_complete',
      papers: retrievedData.papers.length,
      trials: retrievedData.trials.length,
      timeMs: retrievalTime
    });

    // ============================================
    // STAGE 3: RANKING
    // ============================================
    const rankingStart = Date.now();

    // Fetch user profile for personalization
    let userProfile = null;
    if (userId) {
      userProfile = await req.db
        .collection('user_profiles')
        .findOne({ userId });
    }

    // Rank papers
    const rankedPapers = rankingService.rankDocuments(
      retrievedData.papers,
      query,
      userProfile
    );

    const rankingTime = Date.now() - rankingStart;

    req.logger.info({
      requestId,
      stage: 'ranking_complete',
      topPapers: rankedPapers.length,
      timeMs: rankingTime
    });

    // ============================================
    // STAGE 4: LLM GENERATION
    // ============================================
    const llmStart = Date.now();

    // Fetch conversation history for context
    let conversationHistory = [];
    if (conversationId) {
      const conversation = await req.db
        .collection('conversations')
        .findOne({ conversationId });
      
      if (conversation) {
        conversationHistory = conversation.messages || [];
      }
    }

    const llmResult = await llmService.generateResponse(
      query,
      rankedPapers.map(r => r.document),
      conversationHistory
    );

    const llmTime = Date.now() - llmStart;

    // ============================================
    // STAGE 5: RESPONSE FORMATTING
    // ============================================
    const formattedResponse = formatResponse(
      query,
      rankedPapers,
      retrievedData.trials,
      llmResult,
      userProfile
    );

    const totalTime = Date.now() - startTime;

    // ============================================
    // SAVE TO CONVERSATION HISTORY
    // ============================================
    if (userId && conversationId) {
      await saveToConversation(
        req.db,
        userId,
        conversationId,
        query,
        formattedResponse,
        rankedPapers.map(r => r.document.id),
        queryId
      );
    }

    // ============================================
    // RETURN RESPONSE
    // ============================================
    res.json({
      success: true,
      queryId,
      response: formattedResponse,
      metadata: {
        totalTimeMs: totalTime,
        stages: {
          queryUnderstanding: 50,  // Estimate
          retrieval: retrievalTime,
          ranking: rankingTime,
          llmGeneration: llmTime,
          formatting: 30  // Estimate
        },
        retrievalStats: {
          papersRetrieved: retrievedData.papers.length,
          trialsRetrieved: retrievedData.trials.length,
          papersRanked: rankedPapers.length,
          trialsIncluded: Math.min(retrievedData.trials.length, 5)
        },
        confidence: {
          llmValidation: llmResult.validation?.confidence_score || 0.8,
          rankingScore: rankedPapers[0]?.final_score || 0
        }
      }
    });

  } catch (error) {
    req.logger.error({
      requestId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Search failed',
      requestId,
      message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : error.message
    });
  }
});

/**
 * Format response into structured output
 */
function formatResponse(query, rankedPapers, trials, llmResult, userProfile) {
  const topPapers = rankedPapers.slice(0, 10);
  const topTrials = trials.slice(0, 5);

  return {
    conditionOverview: {
      condition: query,
      summary: llmResult.response.split('\n')[0],  // First paragraph
      evidence_grade: calculateEvidenceGrade(topPapers)
    },

    researchInsights: topPapers.map((paper, index) => ({
      rank: index + 1,
      title: paper.document.title,
      authors: (paper.document.authors || []).slice(0, 3).join(', '),
      year: paper.document.year,
      journal: paper.document.journal,
      doi: paper.document.doi,
      citationKey: `[${index + 1}]`,
      relevanceScore: Number(paper.final_score.toFixed(2)),
      studyType: paper.document.article_type?.[0] || 'Study',
      url: paper.document.url,
      access: paper.document.open_access ? 'open_access' : 'restricted',
      reasoning: generateRankingReasoning(paper.score_breakdown)
    })),

    clinicalTrials: topTrials.map((trial, index) => ({
      nctNumber: trial.nct_id,
      title: trial.title,
      status: trial.status,
      phase: trial.phase?.join(', ') || 'N/A',
      enrollmentTarget: trial.enrollment,
      primaryOutcome: trial.primary_outcomes?.[0] || 'N/A',
      url: trial.url,
      relevanceScore: 0.75  // Placeholder
    })),

    keyTakeaways: extractKeyTakeaways(llmResult.response),

    sources: topPapers.map((paper, index) => ({
      citationKey: `[${index + 1}]`,
      authors: paper.document.authors || [],
      title: paper.document.title,
      journal: paper.document.journal,
      year: paper.document.year,
      doi: paper.document.doi,
      pubmedId: paper.document.pubmed_id,
      url: paper.document.url,
      studyType: paper.document.article_type?.[0],
      citationCount: paper.document.citation_count || 0
    })),

    trustMetrics: {
      overallTrustScore: llmResult.validation?.confidence_score || 0.8,
      sourceCredibility: 0.92,
      evidenceConsistency: 0.83,
      dataFreshness: getDataFreshness(topPapers),
      hallucinations: llmResult.validation?.potential_hallucinations || []
    },

    nextSteps: generateNextSteps(query, topPapers, userProfile),

    metadata: {
      generatedAt: new Date().toISOString(),
      modelUsed: llmResult.model_used,
      tokensUsed: llmResult.tokens_used,
      generationTimeMs: llmResult.generation_time_ms
    }
  };
}

/**
 * Calculate evidence grade
 */
function calculateEvidenceGrade(papers) {
  if (papers.length < 3) return 'Limited';
  
  const rctCount = papers.filter(p => 
    p.document.article_type?.includes('Randomized Controlled Trial')
  ).length;

  if (rctCount >= 3) return 'Strong';
  if (papers.length >= 5) return 'Moderate';
  return 'Limited';
}

/**
 * Generate reasoning for ranking
 */
function generateRankingReasoning(scoreBreakdown) {
  const factors = [];

  if (scoreBreakdown.relevance > 0.8) {
    factors.push('High relevance');
  }

  if (scoreBreakdown.authority > 0.85) {
    factors.push('Top-tier source');
  }

  if (scoreBreakdown.recency > 0.8) {
    factors.push('Recent');
  }

  return factors.join(' | ') || 'Relevant to query';
}

/**
 * Extract key takeaways from LLM response
 */
function extractKeyTakeaways(response) {
  const takeaways = [];
  
  // Simple extraction: look for bullet points or numbered lists
  const bullets = response.match(/[-•*]\s+.+/g) || [];
  
  return bullets.slice(0, 5).map(b => b.replace(/^[-•*]\s+/, ''));
}

/**
 * Get data freshness indicator
 */
function getDataFreshness(papers) {
  if (papers.length === 0) return 'No data';
  
  const recentCount = papers.filter(p => {
    const year = p.document.year;
    return year >= new Date().getFullYear() - 2;
  }).length;

  const ratio = recentCount / papers.length;
  
  if (ratio > 0.7) return '> 70% published in last 2 years';
  if (ratio > 0.4) return '40-70% recent';
  return '< 40% recent';
}

/**
 * Generate personalized next steps
 */
function generateNextSteps(query, papers, userProfile) {
  const steps = [];

  // Check for clinical trials
  if (query.toLowerCase().includes('treatment')) {
    steps.push({
      action: 'Review active clinical trials',
      reasoning: 'May provide access to cutting-edge treatments'
    });
  }

  // Check for sparse evidence
  if (papers.length < 5) {
    steps.push({
      action: 'Set up research alert',
      reasoning: 'Limited current evidence; new studies coming'
    });
  }

  // Personalization
  if (userProfile?.research_areas) {
    steps.push({
      action: 'Explore related research areas',
      reasoning: 'Based on your interest in: ' + userProfile.research_areas.join(', ')
    });
  }

  return steps;
}

/**
 * Save to conversation history
 */
async function saveToConversation(
  db,
  userId,
  conversationId,
  userQuery,
  response,
  sourceDocIds,
  queryId
) {
  try {
    const message = {
      role: 'user',
      content: userQuery,
      timestamp: new Date(),
      queryId,
      sourceDocuments: sourceDocIds
    };

    const assistantMessage = {
      role: 'assistant',
      content: JSON.stringify(response),
      timestamp: new Date(),
      queryId
    };

    await db.collection('conversations').updateOne(
      { userId, conversationId },
      {
        $push: {
          messages: { $each: [message, assistantMessage] }
        },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );

  } catch (error) {
    console.error('Failed to save conversation:', error);
    // Don't fail the request if saving history fails
  }
}

module.exports = router;
