import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useOptionSkewSurface() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['option-skew-surface'],
    queryFn: () => api.get<any>('/option-skew-surface'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
