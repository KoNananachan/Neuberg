import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useNuclearEnergy() {
  return useQuery({
    queryKey: ['nuclear-energy'],
    queryFn: () => api.get<any>('/nuclear-energy'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
