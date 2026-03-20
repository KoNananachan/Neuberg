import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useConsumerConfidence() {
  return useQuery({
    queryKey: ['consumer-confidence'],
    queryFn: () => api.get<any>('/consumer-confidence'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
