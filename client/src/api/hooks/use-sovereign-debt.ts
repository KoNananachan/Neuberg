import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSovereignDebt() {
  return useQuery({
    queryKey: ['sovereign-debt'],
    queryFn: () => api.get<any>('/sovereign-debt'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
