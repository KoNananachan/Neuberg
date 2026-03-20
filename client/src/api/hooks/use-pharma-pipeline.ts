import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePharmaPipeline() {
  return useQuery({
    queryKey: ['pharma-pipeline'],
    queryFn: () => api.get<any>('/pharma-pipeline'),
    staleTime: 60 * 60 * 1000,
  });
}
