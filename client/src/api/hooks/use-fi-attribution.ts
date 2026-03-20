import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFiAttribution() {
  return useQuery({
    queryKey: ['fi-attribution'],
    queryFn: () => api.get<any>('/fi-attribution'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
