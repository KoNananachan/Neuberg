import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCurveTrade() {
  return useQuery({
    queryKey: ['curve-trade'],
    queryFn: () => api.get<any>('/curve-trade'),
    staleTime: 60 * 60 * 1000,
  });
}
