import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useOptionStrategyBuilder() {
  return useQuery({
    queryKey: ['option-strategy-builder'],
    queryFn: () => api.get<any>('/option-strategy-builder'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
