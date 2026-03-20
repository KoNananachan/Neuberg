import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSecuritizationPipeline() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['securitization-pipeline'],
    queryFn: () => api.get<any>('/securitization-pipeline'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
