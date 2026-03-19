import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useNaturalGasStorage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['natural-gas-storage'],
    queryFn: () => api.get<any>('/natural-gas-storage'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
