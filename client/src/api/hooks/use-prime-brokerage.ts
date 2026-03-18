import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePrimeBrokerage() {
  return useQuery({
    queryKey: ['prime-brokerage'],
    queryFn: () => api.get<any>('/prime-brokerage'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
