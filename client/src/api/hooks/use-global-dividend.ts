import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useGlobalDividend() {
  return useQuery({
    queryKey: ['global-dividend'],
    queryFn: () => api.get<any>('/global-dividend'),
    staleTime: 60 * 60 * 1000,
  });
}
