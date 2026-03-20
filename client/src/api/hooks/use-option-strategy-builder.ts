import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useOptionStrategyBuilder() {
  return useQuery({
    queryKey: ['option-strategy-builder'],
    queryFn: () => api.get<any>('/option-strategy-builder'),
    staleTime: 60 * 60 * 1000,
  });
}
