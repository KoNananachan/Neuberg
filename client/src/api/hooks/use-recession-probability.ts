import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRecessionProbability() {
  return useQuery({
    queryKey: ['recession-probability'],
    queryFn: () => api.get<any>('/recession-probability'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
