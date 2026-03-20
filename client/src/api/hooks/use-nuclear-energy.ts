import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useNuclearEnergy() {
  return useQuery({
    queryKey: ['nuclear-energy'],
    queryFn: () => api.get<any>('/nuclear-energy'),
    staleTime: 60 * 60 * 1000,
  });
}
