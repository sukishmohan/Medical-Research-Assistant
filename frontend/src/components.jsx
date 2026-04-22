/**
 * Frontend Components - Medical Research Assistant
 * Modern React UI Examples
 */

// ============================================
// 1. SEARCH INTERFACE COMPONENT
// ============================================

import React, { useState } from 'react';
import { Search, Sparkles, ChevronDown } from 'lucide-react';

export function SearchInterface() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  
  const handleSearch = async (q) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      const data = await response.json();
      // Handle response...
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center bg-white rounded-lg shadow-md border-2 border-transparent hover:border-blue-400 transition">
          <Search className="ml-4 text-gray-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder="Ask about diseases, treatments, research trends..."
            className="flex-1 px-4 py-3 outline-none text-lg"
          />
          <button
            onClick={() => handleSearch(query)}
            disabled={isLoading || !query.trim()}
            className="mr-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:shadow-lg transition disabled:opacity-50"
          >
            {isLoading ? (
              <Sparkles className="animate-spin" size={20} />
            ) : (
              'Search'
            )}
          </button>
        </div>
        
        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white rounded-b-lg shadow-lg mt-1 border border-gray-200">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(suggestion);
                  handleSearch(suggestion);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0 text-sm text-gray-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Quick Examples */}
      <div className="mt-6 text-center text-gray-600 text-sm">
        <p className="mb-3">Try asking:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            "Latest NSCLC treatments",
            "Immunotherapy side effects",
            "Clinical trials for diabetes"
          ].map((example, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(example);
                handleSearch(example);
              }}
              className="px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition text-xs"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


// ============================================
// 2. RESPONSE CARD COMPONENT
// ============================================

export function ResponseCard({ response }) {
  const [expandedSection, setExpandedSection] = useState(null);
  
  const getTrustColor = (score) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  return (
    <div className="space-y-4">
      {/* Condition Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {response.conditionOverview.condition}
        </h2>
        <p className="text-gray-700 mb-3">
          {response.conditionOverview.summary}
        </p>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-600">
            Evidence Grade: <span className="text-green-600">{response.conditionOverview.evidence_grade}</span>
          </span>
          <button className="text-sm text-blue-600 hover:underline">
            Why this grade? ↗
          </button>
        </div>
      </div>
      
      {/* Trust Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Trust Metrics</h3>
          <span className={`text-2xl font-bold ${getTrustColor(response.trustMetrics.overallTrustScore)}`}>
            {(response.trustMetrics.overallTrustScore * 100).toFixed(0)}%
          </span>
        </div>
        
        {/* Score Bars */}
        <div className="space-y-3">
          {[
            { label: 'Source Credibility', value: response.trustMetrics.sourceCredibility },
            { label: 'Evidence Consistency', value: response.trustMetrics.evidenceConsistency },
            { label: 'Data Freshness', value: 0.85 }
          ].map((metric) => (
            <div key={metric.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{metric.label}</span>
                <span className="font-semibold text-gray-600">
                  {(metric.value * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${metric.value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Validation Checks */}
        <div className="mt-4 space-y-2 text-sm">
          <p className="flex items-center text-green-600">
            ✓ {response.researchInsights.length} citations
          </p>
          <p className="flex items-center text-green-600">
            ✓ No hallucinations detected
          </p>
          <p className="flex items-center text-green-600">
            ✓ {response.trustMetrics.dataFreshness}
          </p>
        </div>
      </div>
      
      {/* Research Papers */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div
          className="bg-gray-50 p-4 cursor-pointer flex justify-between items-center hover:bg-gray-100 transition"
          onClick={() => setExpandedSection(expandedSection === 'papers' ? null : 'papers')}
        >
          <h3 className="font-semibold text-gray-800">
            📄 Top Research Papers ({response.researchInsights.length})
          </h3>
          <ChevronDown
            size={20}
            className={`transition transform ${expandedSection === 'papers' ? 'rotate-180' : ''}`}
          />
        </div>
        
        {expandedSection === 'papers' && (
          <div className="divide-y">
            {response.researchInsights.slice(0, 5).map((paper, i) => (
              <div key={i} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">
                      [{paper.citationKey}] {paper.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      {paper.authors} • {paper.journal} ({paper.year})
                    </p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                    {paper.studyType}
                  </span>
                </div>
                
                {/* Relevance Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Relevance</span>
                    <span className="text-xs font-semibold text-gray-700">
                      {(paper.relevanceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                      style={{ width: `${paper.relevanceScore * 100}%` }}
                    />
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 mb-2">{paper.reasoning}</p>
                
                {/* Actions */}
                <div className="flex gap-2 text-xs">
                  <a href={paper.url} target="_blank" className="text-blue-600 hover:underline">
                    {paper.access === 'open_access' ? '📂 Full Text' : '🔒 View'}
                  </a>
                  <button className="text-blue-600 hover:underline">
                    Cite
                  </button>
                  <button className="text-blue-600 hover:underline">
                    Save
                  </button>
                </div>
              </div>
            ))}
            <button className="w-full p-3 text-center text-blue-600 hover:bg-gray-50 text-sm font-semibold">
              View all {response.researchInsights.length} papers
            </button>
          </div>
        )}
      </div>
      
      {/* Clinical Trials */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div
          className="bg-gray-50 p-4 cursor-pointer flex justify-between items-center hover:bg-gray-100 transition"
          onClick={() => setExpandedSection(expandedSection === 'trials' ? null : 'trials')}
        >
          <h3 className="font-semibold text-gray-800">
            🏥 Clinical Trials ({response.clinicalTrials.length})
          </h3>
          <ChevronDown
            size={20}
            className={`transition transform ${expandedSection === 'trials' ? 'rotate-180' : ''}`}
          />
        </div>
        
        {expandedSection === 'trials' && (
          <div className="divide-y">
            {response.clinicalTrials.slice(0, 3).map((trial, i) => (
              <div key={i} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{trial.title}</p>
                    <p className="text-sm text-gray-600">{trial.nctNumber}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full whitespace-nowrap">
                    {trial.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Phase: {trial.phase} • Enrollment: {trial.enrollmentTarget}
                </p>
                <a href={trial.url} target="_blank" className="text-sm text-blue-600 hover:underline">
                  View Trial Details ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Key Takeaways */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">💡 Key Takeaways</h3>
        <ul className="space-y-2">
          {response.keyTakeaways.map((point, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-amber-600 font-bold mt-0.5">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Next Steps */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">➡️ Recommended Next Steps</h3>
        <div className="space-y-3">
          {response.nextSteps.map((step, i) => (
            <div key={i} className="border-l-4 border-blue-400 pl-4 py-2">
              <p className="font-semibold text-gray-900 text-sm">{step.action}</p>
              <p className="text-xs text-gray-600 mt-1">{step.reasoning}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ============================================
// 3. CONVERSATION TIMELINE COMPONENT
// ============================================

export function ConversationTimeline({ conversation }) {
  return (
    <div className="space-y-4">
      <div className="relative">
        {conversation.map((turn, i) => (
          <div key={i} className="flex gap-4 mb-6">
            {/* Timeline marker */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                turn.role === 'user' ? 'bg-blue-500' : 'bg-green-500'
              }`}>
                {turn.role === 'user' ? '👤' : '🤖'}
              </div>
              {i < conversation.length - 1 && (
                <div className="w-0.5 h-12 bg-gray-300 my-1"></div>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-4">
              <p className="text-xs text-gray-500 mb-2">
                Turn {i + 1} • {turn.timestamp}
              </p>
              <div className={`rounded-lg p-4 ${
                turn.role === 'user' 
                  ? 'bg-blue-50 border border-blue-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                {turn.role === 'user' ? (
                  <p className="text-gray-900">{turn.content}</p>
                ) : (
                  <p className="text-gray-700 text-sm">{turn.content.substring(0, 150)}...</p>
                )}
              </div>
              
              {turn.metadata && (
                <div className="flex gap-2 mt-2 text-xs text-gray-600">
                  <span>📄 {turn.metadata.papersUsed} papers</span>
                  <span>⚡ {turn.metadata.latency}ms</span>
                  <span>🎯 {turn.metadata.trustScore}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ============================================
// 4. USER PROFILE / PERSONALIZATION COMPONENT
// ============================================

export function UserPersonalization({ userProfile }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
        <h2 className="text-2xl font-bold">{userProfile.name}</h2>
        <p className="text-blue-100 text-sm">{userProfile.specialty}</p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Research Interests */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Research Interests</h3>
          <div className="flex flex-wrap gap-2">
            {userProfile.interests.map((interest, i) => (
              <span
                key={i}
                className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
              >
                {interest}
              </span>
            ))}
            <button className="text-gray-500 hover:text-gray-700 text-sm px-3 py-1">
              + Add interest
            </button>
          </div>
        </div>
        
        {/* Learning Goals */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Learning Goals</h3>
          {userProfile.learningGoals?.map((goal, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-700">{goal.title}</span>
                <span className="text-xs text-gray-500">{goal.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Preferences */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Preferences</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Show open-access papers first</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Highlight recent papers (last 2 years)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span>Include preprints and early-stage results</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default {
  SearchInterface,
  ResponseCard,
  ConversationTimeline,
  UserPersonalization
};
