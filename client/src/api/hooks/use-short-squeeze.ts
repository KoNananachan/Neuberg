import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useShortSqueeze() {
  return useQuery({
    queryKey: ['short-squeeze'],
    queryFn: () => api.get<any>('/short-squeeze'),
    staleTime: 60 * 60 * 1000,
  });
}
