import { useCallback, useState } from 'react';
import { logError } from './logger';

export type LiveVoiceState = 'idle' | 'connecting' | 'listening' | 'speaking';

export function useLiveVoice() {
  const [state, setState] = useState<LiveVoiceState>('idle');

  const stop = useCallback(() => {
    setState('idle');
  }, []);

  const start = useCallback(async () => {
    setState('connecting');
    const error = new Error('Voice mode disabled until Gemini Live is proxied server-side.');
    await logError('useLiveVoice', error);
    setState('idle');
  }, []);

  return { state, start, stop };
}
