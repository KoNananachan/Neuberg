import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePharmaPipeline() {
  return useQuery({
    queryKey: ['pharma-pipeline'],
    queryFn: () => api.get<any>('/pharma-pipeline'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
