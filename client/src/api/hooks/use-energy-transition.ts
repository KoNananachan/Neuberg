import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEnergyTransition() {
  return useQuery({
    queryKey: ['energy-transition'],
    queryFn: () => api.get<any>('/energy-transition'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
