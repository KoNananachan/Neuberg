import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRatesStrategy() {
  return useQuery({
    queryKey: ['rates-strategy'],
    queryFn: () => api.get<any>('/rates-strategy'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
