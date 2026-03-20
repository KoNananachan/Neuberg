import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useConvertibleBondAnalyzer() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['convertible-bond-analyzer'],
    queryFn: () => api.get<any>('/convertible-bond-analyzer'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
