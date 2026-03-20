import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEmissionsTrading() {
  return useQuery({
    queryKey: ['emissions-trading'],
    queryFn: () => api.get<any>('/emissions-trading'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
