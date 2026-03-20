import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEnergyTransition() {
  return useQuery({
    queryKey: ['energy-transition'],
    queryFn: () => api.get<any>('/energy-transition'),
    staleTime: 60 * 60 * 1000,
  });
}
