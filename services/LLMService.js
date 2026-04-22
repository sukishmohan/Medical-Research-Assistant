/**
 * LLM Service
 * 
 * Handles integration with Llama 3.1 via Groq API
 * Features:
 * - Prompt engineering with system prompts
 * - Context injection from retrieved documents
 * - Hallucination prevention
 * - Response validation
 */

const axios = require('axios');

class LLMService {
  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY || '';
    this.groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'llama-3.1-70b-versatile';  // Groq's fastest Llama 3.1 model
    this.timeout = 60000;  // 60 second timeout for LLM

    if (!this.groqApiKey) {
      console.warn('GROQ_API_KEY not set. LLM functionality will be unavailable.');
    }

    this.systemPrompt = `You are an expert medical research synthesizer. Your role is to:

1. SYNTHESIS: Summarize findings from peer-reviewed research papers
2. GROUNDING: Only cite information explicitly stated in provided documents
3. HONESTY: Explicitly state when evidence is limited or conflicting
4. CLARITY: Use clear, professional medical language with explanations

STRICT RULES:
- If information is NOT in the provided documents, DO NOT mention it
- If conflicting evidence exists, highlight ALL viewpoints
- Quantify certainty: "Strong evidence (5+ RCTs)" vs "Limited (case reports)"
- Flag outdated information if applicable
- Always include: Evidence level, Number of studies, Study types

RESPONSE STRUCTURE:
1. Direct answer to the question (1-2 sentences)
2. Supporting evidence (cite studies with [Author, Year])
3. Magnitude of effect (absolute numbers when available)
4. Clinical implications
5. Uncertainties or gaps
6. End with complete source list

TONE: Professional, cautious, transparent about limitations
DISCLAIMER: This is for research purposes. Not medical advice.`;
  }

  /**
   * Generate response using LLM
   */
  async generateResponse(userQuery, retrievedDocuments, conversationHistory = []) {
    try {
      // Build context-injected prompt
      const prompt = this.buildPrompt(
        userQuery,
        retrievedDocuments,
        conversationHistory
      );

      // Call Llama 3.1 via Groq API
      const response = await axios.post(
        this.groqUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,  // Low temperature for factual responses
          max_tokens: 1024,
          top_p: 0.9
        },
        {
          timeout: this.timeout,
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const llmResponse = response.data.choices[0]?.message?.content || '';

      // Validate response
      const validation = this.validateResponse(llmResponse, retrievedDocuments);

      return {
        response: validation.cleaned_response || llmResponse,
        validation: validation,
        model_used: this.model,
        tokens_used: response.data.usage?.completion_tokens || 0,
        generation_time_ms: response.headers['x-groq-time'] ? 
          parseInt(response.headers['x-groq-time']) : 0
      };

    } catch (error) {
      console.error('LLM generation error:', error.message);
      
      // Fallback: return structured response from documents
      if (error.code === 'ECONNREFUSED' || error.message.includes('401') || error.message.includes('403')) {
        console.warn('Groq API unavailable or unauthorized, returning document summary');
        return this.generateFallbackResponse(userQuery, retrievedDocuments);
      }

      throw error;
    }
  }

  /**
   * Build prompt with context injection
   */
  buildPrompt(userQuery, retrievedDocuments, conversationHistory = []) {
    let prompt = this.systemPrompt + '\n\n';

    // Add conversation history if exists
    if (conversationHistory.length > 0) {
      prompt += '---PREVIOUS CONVERSATION---\n';
      conversationHistory.slice(-5).forEach(msg => {  // Last 5 turns
        prompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
      });
      prompt += '---END HISTORY---\n\n';
    }

    // Add retrieved documents
    if (retrievedDocuments.length > 0) {
      prompt += '---RETRIEVED RESEARCH DOCUMENTS---\n';
      
      retrievedDocuments.slice(0, 20).forEach((doc, index) => {
        prompt += `\n[${index + 1}] ${doc.title || 'Untitled'}\n`;
        prompt += `Authors: ${(doc.authors || []).slice(0, 3).join(', ')}\n`;
        prompt += `Journal: ${doc.journal || 'Unknown'} (${doc.year || 'N/A'})\n`;
        
        if (doc.abstract) {
          prompt += `Abstract: ${doc.abstract.substring(0, 300)}...\n`;
        }
        
        if (doc.source === 'clinicaltrials') {
          prompt += `Status: ${doc.status}\n`;
          prompt += `Enrollment: ${doc.enrollment}\n`;
        }
      });

      prompt += '\n---END DOCUMENTS---\n\n';
    }

    // Add current query
    prompt += `---USER QUESTION---\n${userQuery}\n\n`;
    prompt += '---YOUR RESPONSE---\nPlease synthesize the research to answer the question. Remember: Only cite information from the provided documents. Include confidence level for each claim.\n';

    return prompt;
  }

  /**
   * Validate LLM response for hallucinations
   */
  validateResponse(response, documents) {
    const validation = {
      response_length: response.length,
      contains_citations: (response.match(/\[\d+\]/g) || []).length,
      contains_disclaimers: this.hasDisclaimers(response),
      potential_hallucinations: [],
      confidence_score: 0.8,
      cleaned_response: response
    };

    // Check for common hallucination patterns
    const hallucinations = this.detectHallucinations(response, documents);
    if (hallucinations.length > 0) {
      validation.potential_hallucinations = hallucinations;
      
      // Remove hallucinated content
      validation.cleaned_response = this.removeHallucinations(response, hallucinations);
      validation.confidence_score *= 0.7;  // Reduce confidence
    }

    return validation;
  }

  /**
   * Detect potential hallucinations
   */
  detectHallucinations(response, documents) {
    const hallucinations = [];

    // Extract sentences
    const sentences = response.match(/[^.!?]+[.!?]+/g) || [];

    // For each sentence, check if it's supported by documents
    sentences.forEach(sentence => {
      const hasCitation = /\[\d+\]/.test(sentence);
      
      if (!hasCitation && this.isFactualClaim(sentence)) {
        // Check if any document supports this
        const isSupported = documents.some(doc => {
          const abstract = (doc.abstract || '').toLowerCase();
          const title = (doc.title || '').toLowerCase();
          const combined = abstract + ' ' + title;
          
          // Simple keyword overlap check
          const words = sentence.toLowerCase().split(/\W+/).filter(w => w.length > 3);
          const matchCount = words.filter(w => combined.includes(w)).length;
          
          return matchCount / words.length > 0.6;  // 60% match threshold
        });

        if (!isSupported) {
          hallucinations.push({
            sentence: sentence.trim(),
            reason: 'Not found in provided documents'
          });
        }
      }
    });

    return hallucinations;
  }

  /**
   * Identify if sentence is a factual claim (not opinion)
   */
  isFactualClaim(sentence) {
    const nonFactualPatterns = [
      /^I\s+(think|believe|suggest)/i,
      /^This\s+(is\s+)?(interesting|important|notable)/i,
      /^(However|Therefore|Thus)/i,
      /^(We\s+should|One\s+could|It\s+may\s+be)/i
    ];

    return !nonFactualPatterns.some(pattern => pattern.test(sentence));
  }

  /**
   * Remove hallucinated content
   */
  removeHallucinations(response, hallucinations) {
    let cleaned = response;

    hallucinations.forEach(halluc => {
      // Replace with caveat
      cleaned = cleaned.replace(
        halluc.sentence,
        `[CAVEAT: ${halluc.reason}] ${halluc.sentence}`
      );
    });

    return cleaned;
  }

  /**
   * Check if response includes appropriate disclaimers
   */
  hasDisclaimers(response) {
    const disclaimerKeywords = [
      'not medical advice',
      'consult',
      'healthcare provider',
      'research purposes'
    ];

    return disclaimerKeywords.some(keyword => 
      response.toLowerCase().includes(keyword)
    );
  }

  /**
   * Fallback response when Ollama is unavailable
   */
  generateFallbackResponse(userQuery, documents) {
    // Extract key findings from top documents
    const topDocs = documents.slice(0, 5);
    
    const findings = topDocs
      .map((doc, i) => `[${i + 1}] ${doc.title} (${doc.year}) - ${doc.abstract?.substring(0, 200)}`)
      .join('\n\n');

    const fallbackResponse = `Based on recent research:\n\n${findings}\n\nNote: This is a document summary. For comprehensive synthesis, enable the LLM backend (Ollama).`;

    return {
      response: fallbackResponse,
      is_fallback: true,
      validation: {
        confidence_score: 0.5,
        contains_citations: topDocs.length
      }
    };
  }

  /**
   * Stream response (for real-time UI updates)
   */
  async *streamResponse(userQuery, retrievedDocuments, conversationHistory = []) {
    try {
      const prompt = this.buildPrompt(
        userQuery,
        retrievedDocuments,
        conversationHistory
      );

      const response = await axios.post(
        this.groqUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1024,
          stream: true
        },
        {
          timeout: this.timeout,
          responseType: 'stream',
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices[0]?.delta?.content || '';
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip parsing errors
            }
          }
        }
      }

    } catch (error) {
      console.error('Stream error:', error.message);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.groqApiKey) {
        return {
          healthy: false,
          error: 'GROQ_API_KEY not configured'
        };
      }

      // Simple test call
      const response = await axios.post(
        this.groqUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: 'Say OK'
            }
          ],
          max_tokens: 10
        },
        {
          timeout: 5000,
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        healthy: true,
        model: this.model,
        api: 'groq'
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        api: 'groq'
      };
    }
  }
}

module.exports = LLMService;
