/**
 * Medical Research Assistant - Main App Component
 * 
 * Features:
 * - Query input interface
 * - Real-time response streaming
 * - Source cards with citations
 * - Trust score visualization
 * - Conversation history
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, TrendingUp, FileText, Beaker, AlertCircle } from 'lucide-react';
import SearchInterface from './components/SearchInterface';
import ResponseDisplay from './components/ResponseDisplay';
import ConversationHistory from './components/ConversationHistory';
import useConversation from './hooks/useConversation';

export default function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const responseRef = useRef(null);

  const {
    conversationId,
    messages,
    addMessage,
    loadConversation,
    createNewConversation
  } = useConversation();

  // Handle search submission
  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;

    setQuery(searchQuery);
    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          userId: getUserId(),
          conversationId
        })
      });

      const data = await res.json();

      if (data.success) {
        setResponse(data.response);
        addMessage({
          role: 'user',
          content: searchQuery,
          timestamp: new Date()
        });
        addMessage({
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        });

        // Scroll to response
        setTimeout(() => {
          responseRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }

    } catch (error) {
      console.error('Search error:', error);
      setResponse({
        error: 'Failed to fetch research. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get or create user ID
  const getUserId = () => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', userId);
    }
    return userId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Beaker className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Medical Research Assistant</h1>
          </div>
          <button
            onClick={createNewConversation}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            New Research
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Conversation History */}
        <div className="lg:col-span-1 h-fit sticky top-20">
          <ConversationHistory
            onSelectConversation={loadConversation}
            currentConversationId={conversationId}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search Interface */}
          <SearchInterface
            onSearch={handleSearch}
            isLoading={isLoading}
            query={query}
          />

          {/* Loading State */}
          {isLoading && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
              </div>
              <p className="mt-4 text-slate-400">
                Searching research across 3 sources + synthesizing with AI...
              </p>
            </div>
          )}

          {/* Error State */}
          {response?.error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-semibold">Error</p>
                <p className="text-red-300 text-sm">{response.error}</p>
              </div>
            </div>
          )}

          {/* Response Display */}
          {response && !response.error && (
            <div ref={responseRef}>
              <ResponseDisplay response={response} />
            </div>
          )}

          {/* Empty State */}
          {!response && !isLoading && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
              <Search className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-300 mb-2">
                Start your medical research
              </h2>
              <p className="text-slate-400 max-w-md mx-auto">
                Ask questions about treatments, clinical trials, diagnosis criteria, 
                epidemiology, and more. We'll search across PubMed, OpenAlex, and 
                ClinicalTrials.gov to find the latest evidence.
              </p>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleSearch('What are the latest treatments for stage 3 NSCLC?')}
                  className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition"
                >
                  <FileText className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="text-sm font-semibold text-white">Cancer Treatment</p>
                  <p className="text-xs text-slate-400 mt-1">NSCLC immunotherapy</p>
                </button>

                <button
                  onClick={() => handleSearch('What biomarkers predict immunotherapy response?')}
                  className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition"
                >
                  <TrendingUp className="w-5 h-5 text-green-400 mb-2" />
                  <p className="text-sm font-semibold text-white">Biomarkers</p>
                  <p className="text-xs text-slate-400 mt-1">Predictive markers</p>
                </button>

                <button
                  onClick={() => handleSearch('Risk factors for type 2 diabetes in adolescents')}
                  className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition"
                >
                  <Beaker className="w-5 h-5 text-purple-400 mb-2" />
                  <p className="text-sm font-semibold text-white">Epidemiology</p>
                  <p className="text-xs text-slate-400 mt-1">Risk factors study</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-slate-400 text-sm">
          <p>
            This tool synthesizes research from PubMed, OpenAlex, and ClinicalTrials.gov.
            <br />
            <span className="text-red-400">⚠️ Not medical advice. Always consult healthcare providers.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
