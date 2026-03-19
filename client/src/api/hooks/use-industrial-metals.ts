import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useIndustrialMetals() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['industrial-metals'],
    queryFn: () => api.get<any>('/industrial-metals'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
