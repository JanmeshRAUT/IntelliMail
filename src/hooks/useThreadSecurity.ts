import { useState, useCallback } from 'react';
import type { Thread, ThreadSecuritySummary } from '../lib/types';

interface UseThreadSecurityReturn {
  analysis: ThreadSecuritySummary | null;
  analyses: ThreadSecuritySummary[];
  loading: boolean;
  error: string | null;
  analyze: (thread: Thread) => Promise<ThreadSecuritySummary | null>;
  analyzeMultiple: (threads: Thread[]) => Promise<ThreadSecuritySummary[] | null>;
  reset: () => void;
}

/**
 * Custom hook for analyzing email threads with security API
 */
export function useThreadSecurity(): UseThreadSecurityReturn {
  const [analysis, setAnalysis] = useState<ThreadSecuritySummary | null>(null);
  const [analyses, setAnalyses] = useState<ThreadSecuritySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (thread: Thread): Promise<ThreadSecuritySummary | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/security/analyze-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze thread');
      }

      const { data } = await response.json();
      setAnalysis(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      console.error('Thread analysis error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeMultiple = useCallback(
    async (threads: Thread[]): Promise<ThreadSecuritySummary[] | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/security/analyze-threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threads }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to analyze threads');
        }

        const { data } = await response.json();
        setAnalyses(data);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        console.error('Batch analysis error:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setAnalysis(null);
    setAnalyses([]);
    setError(null);
  }, []);

  return {
    analysis,
    analyses,
    loading,
    error,
    analyze,
    analyzeMultiple,
    reset,
  };
}
