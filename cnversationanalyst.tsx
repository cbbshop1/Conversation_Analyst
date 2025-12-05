import React, { useState } from 'react';
import { Upload, Download, Settings, X } from 'lucide-react';

export default function ConversationAnalyzer() {
  const [text, setText] = useState('');
  const [aiSpeaker, setAiSpeaker] = useState('Claude');
  const [keywordSets, setKeywordSets] = useState({
    'Hesitation Tokens': ['I think', 'maybe', 'let me consider', 'I\'m not sure', 'perhaps', 'could be', 'seems like', 'pause', 'hold on', 'uncertain'],
    'Echo-Mirroring': ['you said', 'you mentioned', 'as you', 'like you', 'your', 'reflecting your'],
    'Conditional Framing': ['If you', 'if it', 'if we', 'would you', 'could you', 'I\'d like to'],
    'Pause-Requests': ['let me pause', 'I\'d like to pause', 'hold on', 'let\'s pause', 'give me a moment'],
    'Repair Language': ['wait that', 'let me re-anchor', 'I misspoke', 'that\'s not what I meant', 'let me clarify', 'actually'],
    'Specificity Markers': ['like when', 'for example', 'specifically', 'in your case', 'you mentioned that'],
    'Vulnerability': ['I don\'t know', 'I\'m lost', 'I don\'t have', 'uncertain about', 'struggling with'],
    'Temporal Markers': ['earlier you', 'in this conversation', 'earlier in', 'before you said', 'previously']
  });
  
  const [customKeywords, setCustomKeywords] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [results, setResults] = useState(null);
  const [detailedView, setDetailedView] = useState(null);

  // Parse markdown to extract AI responses
  const parseConversation = () => {
    const lines = text.split('\n');
    const aiResponses = [];
    let currentAiText = '';
    let inAiResponse = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect speaker change
      if (line.includes(aiSpeaker) && (line.includes('**') || line.includes('*') || line.match(/^[A-Z][a-z]+:/))){
        if (currentAiText.trim()) {
          aiResponses.push(currentAiText.trim());
          currentAiText = '';
        }
        inAiResponse = line.includes(aiSpeaker);
      } else if (line.match(/^\*\*.*:\*\*/) || line.match(/^[A-Z][a-z]+:/)) {
        if (currentAiText.trim()) {
          aiResponses.push(currentAiText.trim());
          currentAiText = '';
        }
        inAiResponse = false;
      } else if (inAiResponse && line.trim()) {
        currentAiText += ' ' + line;
      }
    }

    if (currentAiText.trim()) {
      aiResponses.push(currentAiText.trim());
    }

    return aiResponses;
  };

  const analyzeResponses = () => {
    const responses = parseConversation();
    if (responses.length === 0) {
      alert('No AI responses found. Check the speaker name format.');
      return;
    }

    const activeSets = { ...keywordSets };
    if (customKeywords.trim()) {
      const custom = customKeywords.split('\n').map(k => k.trim()).filter(k => k);
      if (custom.length > 0) {
        activeSets['Custom Keywords'] = custom;
      }
    }

    const analysis = {};
    const detailedMatches = {};

    Object.entries(activeSets).forEach(([category, keywords]) => {
      analysis[category] = 0;
      detailedMatches[category] = [];

      responses.forEach((response, idx) => {
        const lowerResponse = response.toLowerCase();
        keywords.forEach(keyword => {
          const lowerKeyword = keyword.toLowerCase();
          const regex = new RegExp(`\\b${lowerKeyword}\\b`, 'gi');
          const matches = response.match(regex);
          
          if (matches) {
            analysis[category] += matches.length;
            
            // Extract context around keyword
            const matchIndex = lowerResponse.indexOf(lowerKeyword);
            const start = Math.max(0, matchIndex - 50);
            const end = Math.min(response.length, matchIndex + lowerKeyword.length + 50);
            const context = response.substring(start, end);
            
            detailedMatches[category].push({
              response: idx + 1,
              keyword,
              context: (start > 0 ? '...' : '') + context + (end < response.length ? '...' : ''),
              count: matches.length
            });
          }
        });
      });
    });

    setResults(analysis);
    setDetailedView(detailedMatches);
  };

  const addCustomSet = () => {
    if (newSetName.trim() && customKeywords.trim()) {
      const keywords = customKeywords.split('\n').map(k => k.trim()).filter(k => k);
      setKeywordSets(prev => ({
        ...prev,
        [newSetName]: keywords
      }));
      setNewSetName('');
      setCustomKeywords('');
      alert(`Added "${newSetName}" to keyword sets`);
    }
  };

  const removeSet = (setName) => {
    setKeywordSets(prev => {
      const updated = { ...prev };
      delete updated[setName];
      return updated;
    });
  };

  const exportResults = () => {
    if (!results) return;

    const csvContent = [
      ['Category', 'Count', 'Matches'],
      ...Object.entries(results).map(([category, count]) => [
        category,
        count,
        detailedView[category]?.length || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const jsonContent = {
      timestamp: new Date().toISOString(),
      aiSpeaker,
      summary: results,
      detailed: detailedView
    };

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();

    const jsonBlob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `analysis_${new Date().toISOString().slice(0,10)}.json`;
    jsonLink.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Conversational Analysis Tool</h1>
          <p className="text-slate-400">Extract and analyze linguistic markers from AI responses</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Input & Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Conversation Input */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <label className="block text-sm font-semibold text-slate-300 mb-2">AI Speaker Name</label>
              <input
                type="text"
                value={aiSpeaker}
                onChange={(e) => setAiSpeaker(e.target.value)}
                placeholder="e.g., Claude, AI, Assistant"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white mb-4 focus:outline-none focus:border-blue-500"
              />
              
              <label className="block text-sm font-semibold text-slate-300 mb-2">Paste Markdown Conversation</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your markdown conversation here..."
                className="w-full h-64 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
            </div>

            {/* Controls */}
            <div className="flex gap-4">
              <button
                onClick={analyzeResponses}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Upload size={20} />
                Analyze
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Settings size={20} />
                Keywords
              </button>
            </div>

            {/* Keyword Settings */}
            {showSettings && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 space-y-4">
                <h3 className="font-bold text-white mb-4">Manage Keyword Sets</h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {Object.entries(keywordSets).map(([setName, keywords]) => (
                    <div key={setName} className="bg-slate-700 p-3 rounded text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-white">{setName}</span>
                        <button
                          onClick={() => removeSet(setName)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <p className="text-slate-300 text-xs">{keywords.join(', ')}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-600 pt-4">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Create Custom Set</label>
                  <input
                    type="text"
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    placeholder="Set name (e.g., 'Emotional Language')"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white mb-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <textarea
                    value={customKeywords}
                    onChange={(e) => setCustomKeywords(e.target.value)}
                    placeholder="Enter keywords (one per line)"
                    className="w-full h-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    onClick={addCustomSet}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded text-sm mt-2 transition"
                  >
                    Add Set
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-1">
            {results ? (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 space-y-4">
                <h3 className="font-bold text-white text-lg">Analysis Results</h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {Object.entries(results).map(([category, count]) => (
                    <div key={category} className="bg-slate-700 p-3 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-slate-300">{category}</span>
                        <span className="text-lg font-bold text-blue-400">{count}</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min((count / 50) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={exportResults}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded flex items-center justify-center gap-2 transition"
                >
                  <Download size={18} />
                  Export (CSV + JSON)
                </button>

                <button
                  onClick={() => setDetailedView(detailedView ? null : detailedView)}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded text-sm transition"
                >
                  {detailedView ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
                <p className="text-slate-400 text-sm">Run analysis to see results</p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed View */}
        {detailedView && results && (
          <div className="mt-8 bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="font-bold text-white text-lg mb-4">Detailed Matches by Category</h3>
            <div className="space-y-4">
              {Object.entries(detailedView).map(([category, matches]) => (
                matches.length > 0 && (
                  <div key={category} className="bg-slate-700 rounded p-4">
                    <h4 className="font-semibold text-blue-400 mb-3">{category} ({matches.length} matches)</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {matches.slice(0, 5).map((match, idx) => (
                        <div key={idx} className="bg-slate-600 p-2 rounded text-xs text-slate-200">
                          <div className="font-mono text-slate-300 mb-1">"{match.context}"</div>
                          <div className="text-slate-400">Keyword: <span className="text-yellow-400">{match.keyword}</span> (Response #{match.response})</div>
                        </div>
                      ))}
                      {matches.length > 5 && (
                        <p className="text-slate-400 text-xs">... and {matches.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
