import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLoanSyndicationPipeline() {
  return useQuery({
    queryKey: ['loan-syndication-pipeline'],
    queryFn: () => api.get<any>('/loan-syndication-pipeline'),
    staleTime: 180000,
  });
}
