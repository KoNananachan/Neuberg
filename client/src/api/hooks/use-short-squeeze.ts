import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useShortSqueeze() {
  return useQuery({
    queryKey: ['short-squeeze'],
    queryFn: () => api.get<any>('/short-squeeze'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
