import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTradeIdeas() {
  return useQuery({
    queryKey: ['trade-ideas'],
    queryFn: () => api.get<any>('/trade-ideas'),
    staleTime: 60 * 60 * 1000,
  });
}
