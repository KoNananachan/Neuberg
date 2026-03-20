import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useOptionsSkew() {
  return useQuery({
    queryKey: ['options-skew'],
    queryFn: () => api.get<any>('/options-skew'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
