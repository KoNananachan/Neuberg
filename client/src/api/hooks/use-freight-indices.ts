import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFreightIndices() {
  return useQuery({
    queryKey: ['freight-indices'],
    queryFn: () => api.get<any>('/freight-indices'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
