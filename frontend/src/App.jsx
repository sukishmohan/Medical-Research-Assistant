import React, { useState } from 'react'
import { Search, Loader } from 'lucide-react'

export default function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    setResults(null)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080'
      const response = await fetch(`${apiUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          userId: localStorage.getItem('userId') || `user_${Date.now()}`
        })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err.message || 'Search failed. Make sure backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Medical Research Assistant</h1>
          <p className="text-blue-100 text-lg">Search across 240M+ academic papers powered by Groq</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center p-4">
              <Search className="w-6 h-6 text-gray-400 mr-4" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a medical research query..."
                className="flex-1 outline-none text-lg"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {results.success ? (
              <>
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Response</h2>
                  <div className="text-gray-700 leading-relaxed">
                    {typeof results.response === 'string' 
                      ? results.response 
                      : JSON.stringify(results.response, null, 2)}
                  </div>
                </div>

                {results.sources && results.sources.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Sources</h3>
                    <div className="space-y-3">
                      {results.sources.map((source, idx) => (
                        <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                          <p className="font-semibold text-gray-800">{source.title || `Source ${idx + 1}`}</p>
                          <p className="text-gray-600 text-sm">{source.url || source.source}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <p className="text-gray-700">{results.message || 'No results found'}</p>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-12 text-center text-blue-100">
          <p>Backend URL: {import.meta.env.VITE_API_URL || 'http://localhost:8080'}</p>
        </div>
      </div>
    </div>
  )
}
