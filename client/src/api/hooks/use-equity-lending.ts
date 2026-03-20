import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityLending() {
  return useQuery({
    queryKey: ['equity-lending'],
    queryFn: () => api.get<any>('/equity-lending'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
