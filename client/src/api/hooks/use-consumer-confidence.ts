import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useConsumerConfidence() {
  return useQuery({
    queryKey: ['consumer-confidence'],
    queryFn: () => api.get<any>('/consumer-confidence'),
    staleTime: 60 * 60 * 1000,
  });
}
