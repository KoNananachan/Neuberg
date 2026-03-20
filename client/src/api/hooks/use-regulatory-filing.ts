import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRegulatoryFiling() {
  return useQuery({
    queryKey: ['regulatory-filing'],
    queryFn: () => api.get<any>('/regulatory-filing'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
