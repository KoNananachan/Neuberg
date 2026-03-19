import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRecessionProbability() {
  return useQuery({
    queryKey: ['recession-probability'],
    queryFn: () => api.get<any>('/recession-probability'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
