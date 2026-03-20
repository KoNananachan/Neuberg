import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useOptionsSkew() {
  return useQuery({
    queryKey: ['options-skew'],
    queryFn: () => api.get<any>('/options-skew'),
    staleTime: 60 * 60 * 1000,
  });
}
