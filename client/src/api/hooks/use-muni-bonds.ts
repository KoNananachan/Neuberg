import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMuniBonds() {
  return useQuery({
    queryKey: ['muni-bonds'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>('/muni-bonds'),
    refetchInterval: 30 * 60_000,
    staleTime: 10 * 60_000,
  });
}
