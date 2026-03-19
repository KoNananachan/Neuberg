import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGDPNowcast() {
  return useQuery({
    queryKey: ['gdp-nowcast'],
    queryFn: () => api.get<any>('/gdp-nowcast'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
