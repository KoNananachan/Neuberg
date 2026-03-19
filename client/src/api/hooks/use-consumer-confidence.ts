import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useConsumerConfidence() {
  return useQuery({
    queryKey: ['consumer-confidence'],
    queryFn: () => api.get<any>('/consumer-confidence'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
