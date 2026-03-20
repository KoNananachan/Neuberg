import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEquityCapitalRaise() {
  return useQuery({
    queryKey: ['equity-capital-raise'],
    queryFn: () => api.get<any>('/equity-capital-raise'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
