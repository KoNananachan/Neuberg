import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGDPNowcast() {
  return useQuery({
    queryKey: ['gdp-nowcast'],
    queryFn: () => api.get<any>('/gdp-nowcast'),
    staleTime: 60 * 60 * 1000,
  });
}
