import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useGlobalDividend() {
  return useQuery({
    queryKey: ['global-dividend'],
    queryFn: () => api.get<any>('/global-dividend'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
