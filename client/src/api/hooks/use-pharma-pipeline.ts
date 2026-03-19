import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePharmaPipeline() {
  return useQuery({
    queryKey: ['pharma-pipeline'],
    queryFn: () => api.get<any>('/pharma-pipeline'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
