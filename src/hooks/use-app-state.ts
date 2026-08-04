import { useCallback, useEffect, useState } from 'react';
import type { RuntimeRequest } from '../messaging/schema';
import type { StoredDatabase } from '../models/types';
import { sendMessage } from '../messaging/client';

export function useAppState() {
  const [state, setState] = useState<StoredDatabase | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const dispatch = useCallback(async (request: RuntimeRequest) => {
    try { setError(''); const next = await sendMessage(request); setState(next); return next; }
    catch (cause) { const message = cause instanceof Error ? cause.message : 'Something went wrong.'; setError(message); throw cause; }
  }, []);
  useEffect(() => { void dispatch({ type: 'GET_STATE' }).finally(() => setLoading(false)); }, [dispatch]);
  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'local' || !changes['resultboard.database']) return;
      void sendMessage({ type: 'GET_STATE' }).then(setState).catch(() => undefined);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);
  return { state, error, loading, dispatch, setError };
}
