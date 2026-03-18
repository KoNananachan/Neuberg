import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCurveTrade() {
  return useQuery({
    queryKey: ['curve-trade'],
    queryFn: () => api.get<any>('/curve-trade'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
