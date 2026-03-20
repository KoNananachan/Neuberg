import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMultiFactor() {
  return useQuery({
    queryKey: ['multi-factor'],
    queryFn: () => api.get<any>('/multi-factor'),
    staleTime: 60 * 60 * 1000,
  });
}
