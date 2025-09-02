import { useState, useCallback, useEffect, useRef } from 'react';

interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  reading_time_seconds: number;
  is_active_session: boolean;
  last_read_at: string;
}

export function useReadingProgress(userId: string, bookId: string) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const sessionStartTime = useRef<Date | null>(null);
  const lastProgressUpdate = useRef<Date>(new Date());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startSession = useCallback(async () => {
    try {
      sessionStartTime.current = new Date();
      lastProgressUpdate.current = new Date();

      const response = await fetch('/api/reading-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          bookId,
          action: 'start_session',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start reading session');
      }

      const data = await response.json();
      setProgress(data.progress);
      
      // Simple time tracking every 60 seconds (no position updates)
      updateIntervalRef.current = setInterval(async () => {
        if (!sessionStartTime.current) return;
        try {
          const now = new Date();
          const timeDiffSeconds = Math.floor((now.getTime() - lastProgressUpdate.current.getTime()) / 1000);
          lastProgressUpdate.current = now;
    
          const progressResponse = await fetch('/api/reading-progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              bookId,
              action: 'update_progress',
              readingTimeSeconds: timeDiffSeconds,
            }),
          });
    
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setProgress(progressData.progress);
          }
        } catch (err) {
          console.error('Error updating reading progress:', err);
        }
      }, 60000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  }, [userId, bookId]);


  const endSession = useCallback(async () => {
    if (!sessionStartTime.current) return;

    try {
      // Clear the update interval
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }

      const now = new Date();
      const timeDiffSeconds = Math.floor((now.getTime() - lastProgressUpdate.current.getTime()) / 1000);

      const response = await fetch('/api/reading-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          bookId,
          action: 'end_session',
          readingTimeSeconds: timeDiffSeconds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to end reading session');
      }

      const data = await response.json();
      setProgress(data.progress);
      sessionStartTime.current = null;
    } catch (err) {
      console.error('Error ending reading session:', err);
    }
  }, [userId, bookId]);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reading-progress?userId=${userId}&bookId=${bookId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reading progress');
      }

      const data = await response.json();
      if (data.progress && data.progress.length > 0) {
        setProgress(data.progress[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
    } finally {
      setLoading(false);
    }
  }, [userId, bookId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return {
    progress,
    loading,
    error,
    startSession,
    endSession,
    fetchProgress,
  };
}