import { useRef, useCallback, useState } from 'react';

interface UseSSEOptions {
  onToken: (token: string) => void;
  onDone?: (versionNumber: string) => void;
  onError?: (error: string) => void;
}

export function useSSE() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (url: string, body: object, options: UseSSEOptions) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || res.statusText);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: done')) {
              const nextDataLine = lines[lines.indexOf(line) + 1];
              if (nextDataLine?.startsWith('data: ')) {
                options.onDone?.(nextDataLine.slice(6));
              }
            } else if (line.startsWith('data: ')) {
              options.onToken(line.slice(6));
            }
          }
        }

        if (buffer.startsWith('data: ')) {
          options.onToken(buffer.slice(6));
        }
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          options.onError?.((err as Error).message);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { startStream, stopStream, isStreaming };
}
