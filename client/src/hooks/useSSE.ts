import { useEffect, useRef } from 'react';

export type SSEEventType =
  | 'stock_changed'
  | 'price_updated'
  | 'reservation_created'
  | 'reservation_expired'
  | 'bulk_price_progress'
  | 'invalidate'
  | 'connected';

type SSEHandler = (event: SSEEventType, data: Record<string, unknown>) => void;

export function useSSE(onEvent: SSEHandler) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const source = new EventSource('/api/events');

    const eventTypes: SSEEventType[] = [
      'stock_changed',
      'price_updated',
      'reservation_created',
      'reservation_expired',
      'bulk_price_progress',
      'invalidate',
    ];

    for (const type of eventTypes) {
      source.addEventListener(type, (e) => {
        try {
          const data = JSON.parse(e.data);
          handlerRef.current(type as SSEEventType, data);
        } catch {
          handlerRef.current(type as SSEEventType, {});
        }
      });
    }

    source.onerror = () => {
      // EventSource auto-reconnects; on reconnect refetch everything
    };

    source.onopen = () => {
      handlerRef.current('connected', {});
    };

    return () => {
      source.close();
    };
  }, []);
}
