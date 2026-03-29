import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api } from '@/api/client';
import { useSSE, type SSEEventType } from './useSSE';

const INVALIDATING_EVENTS: Set<SSEEventType> = new Set([
  'invalidate',
  'stock_changed',
  'price_updated',
  'reservation_created',
  'reservation_expired',
  'connected',
]);

export function useProducts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['products'],
    queryFn: api.getProducts,
  });

  const handleSSE = useCallback(
    (event: SSEEventType) => {
      if (INVALIDATING_EVENTS.has(event)) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    },
    [queryClient],
  );

  useSSE(handleSSE);

  return query;
}
