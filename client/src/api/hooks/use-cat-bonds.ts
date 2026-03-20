import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCatBonds() {
  return useQuery({
    queryKey: ['cat-bonds'],
    queryFn: () => api.get<any>('/cat-bonds'),
    staleTime: 60 * 60 * 1000,
  });
}
