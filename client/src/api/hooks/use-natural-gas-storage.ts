import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useNaturalGasStorage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['natural-gas-storage'],
    queryFn: () => api.get<any>('/natural-gas-storage'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
