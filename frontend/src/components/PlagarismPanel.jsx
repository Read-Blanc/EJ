import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

/**
 * PlagiarismPanel
 *
 * Fetches all other submissions for the same assessment and computes
 * Jaccard similarity between this student's answers and others.
 * Flags any answer pair exceeding the threshold.
 *
 * Props:
 *   assessmentId    — the assessment's id
 *   currentSubId    — this submission's id (excluded from comparison)
 *   answers         — array of { id, answer_text, questions: { text, order_index } }
 */

// Jaccard similarity on word-level bigrams
function tokenize(text = '') {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
}

function bigrams(tokens) {
  const set = new Set();
  for (let i = 0; i < tokens.length - 1; i++) {
    set.add(`${tokens[i]}_${tokens[i + 1]}`);
  }
  // Also add unigrams for short answers
  tokens.forEach(t => set.add(t));
  return set;
}

function jaccardSimilarity(a, b) {
  if (!a.trim() || !b.trim()) return 0;
  const setA = bigrams(tokenize(a));
  const setB = bigrams(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) { if (setB.has(item)) intersection++; }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

const THRESHOLD = 0.45; // Flag if similarity >= 45%

function SimilarityBar({ value }) {
  const pct   = Math.round(value * 100);
  const color = value >= 0.7 ? 'bg-red-500' : value >= 0.55 ? 'bg-amber-400' : 'bg-yellow-300';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold shrink-0 ${value >= 0.7 ? 'text-red-600' : 'text-amber-600'}`}>
        {pct}%
      </span>
    </div>
  );
}

export default function PlagiarismPanel({ assessmentId, currentSubId, answers }) {
  const [checking,  setChecking]  = useState(false);
  const [results,   setResults]   = useState(null); // null = not run yet
  const [expanded,  setExpanded]  = useState(null);

  const runCheck = async () => {
    setChecking(true);
    setResults(null);
    setExpanded(null);

    // Fetch all other submissions + their answers for this assessment
    const { data: otherSubs } = await supabase
      .from('submissions')
      .select('id, profiles(full_name, email), answers(answer_text, question_id)')
      .eq('assessment_id', assessmentId)
      .neq('id', currentSubId);

    if (!otherSubs || otherSubs.length === 0) {
      setResults([]);
      setChecking(false);
      return;
    }

    const flags = [];

    // For each answer in this submission, compare against same question in other subs
    for (const myAnswer of answers) {
      const qId = myAnswer.questions?.id || myAnswer.question_id;
      if (!myAnswer.answer_text?.trim()) continue;

      for (const other of otherSubs) {
        const otherAnswer = other.answers?.find(a => a.question_id === qId);
        if (!otherAnswer?.answer_text?.trim()) continue;

        const sim = jaccardSimilarity(myAnswer.answer_text, otherAnswer.answer_text);
        if (sim >= THRESHOLD) {
          flags.push({
            questionText:   myAnswer.questions?.text || `Question`,
            questionIndex:  myAnswer.questions?.order_index ?? 0,
            myText:         myAnswer.answer_text,
            otherText:      otherAnswer.answer_text,
            otherStudent:   other.profiles?.full_name || other.profiles?.email || 'Unknown Student',
            otherSubId:     other.id,
            similarity:     sim,
          });
        }
      }
    }

    // Sort by highest similarity first
    flags.sort((a, b) => b.similarity - a.similarity);
    setResults(flags);
    setChecking(false);
  };

  const flagCount   = results?.length ?? 0;
  const highRisk    = results?.filter(r => r.similarity >= 0.7).length ?? 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">Plagiarism Check</div>
          <div className="text-xs text-gray-400 mt-0.5">
            Compare answers against other submissions in this assessment
          </div>
        </div>
        <button
          onClick={runCheck}
          disabled={checking}
          className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50"
        >
          {checking ? 'Checking…' : results === null ? 'Run Check' : 'Re-run'}
        </button>
      </div>

      {/* Results */}
      {results === null && !checking && (
        <div className="px-5 py-6 text-center">
          <div className="text-2xl mb-2">🔍</div>
          <p className="text-xs text-gray-400">
            Click "Run Check" to compare this submission against others in the same assessment.
          </p>
        </div>
      )}

      {checking && (
        <div className="px-5 py-6 flex items-center justify-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          Analysing submissions…
        </div>
      )}

      {results !== null && !checking && (
        <div>
          {/* Summary banner */}
          <div className={`px-5 py-3 flex items-center gap-3 border-b border-gray-100 ${
            highRisk > 0 ? 'bg-red-50' : flagCount > 0 ? 'bg-amber-50' : 'bg-green-50'
          }`}>
            <span className="text-lg">
              {highRisk > 0 ? '🚨' : flagCount > 0 ? '⚠️' : '✅'}
            </span>
            <div>
              <div className={`text-sm font-semibold ${
                highRisk > 0 ? 'text-red-700' : flagCount > 0 ? 'text-amber-700' : 'text-green-700'
              }`}>
                {flagCount === 0
                  ? 'No suspicious similarity detected'
                  : `${flagCount} flag${flagCount > 1 ? 's' : ''} found${highRisk > 0 ? ` (${highRisk} high-risk)` : ''}`
                }
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Threshold: {Math.round(THRESHOLD * 100)}% similarity · Jaccard bigram method
              </div>
            </div>
          </div>

          {/* Flag list */}
          {flagCount > 0 && (
            <div className="divide-y divide-gray-50">
              {results.map((flag, i) => (
                <div key={i} className="px-5 py-4">
                  <div
                    className="flex items-center justify-between gap-3 cursor-pointer"
                    onClick={() => setExpanded(expanded === i ? null : i)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-700 truncate">
                        Q{flag.questionIndex + 1}: {flag.questionText}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Similar to: <span className="font-medium text-gray-600">{flag.otherStudent}</span>
                      </div>
                    </div>
                    <div className="shrink-0 w-36">
                      <SimilarityBar value={flag.similarity} />
                    </div>
                    <button className="text-gray-400 text-xs shrink-0">
                      {expanded === i ? '▲' : '▼'}
                    </button>
                  </div>

                  {expanded === i && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                          This submission
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                          {flag.myText}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                          {flag.otherStudent}
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                          {flag.otherText}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}