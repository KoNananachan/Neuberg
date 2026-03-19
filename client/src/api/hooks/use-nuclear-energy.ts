import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useNuclearEnergy() {
  return useQuery({
    queryKey: ['nuclear-energy'],
    queryFn: () => api.get<any>('/nuclear-energy'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
