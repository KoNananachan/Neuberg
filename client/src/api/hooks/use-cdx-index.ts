import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCdxIndex() {
  return useQuery({
    queryKey: ['cdx-index'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>('/cdx-index'),
    refetchInterval: 30 * 60_000,
    staleTime: 10 * 60_000,
  });
}
