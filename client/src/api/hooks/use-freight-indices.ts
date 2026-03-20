import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFreightIndices() {
  return useQuery({
    queryKey: ['freight-indices'],
    queryFn: () => api.get<any>('/freight-indices'),
    staleTime: 60 * 60 * 1000,
  });
}
