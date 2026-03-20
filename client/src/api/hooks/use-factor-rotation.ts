import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFactorRotation() {
  return useQuery({
    queryKey: ['factor-rotation'],
    queryFn: () => api.get<any>('/factor-rotation'),
    staleTime: 60 * 60 * 1000,
  });
}
