import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFactorRotation() {
  return useQuery({
    queryKey: ['factor-rotation'],
    queryFn: () => api.get<any>('/factor-rotation'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
