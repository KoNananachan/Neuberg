import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRecessionProbability() {
  return useQuery({
    queryKey: ['recession-probability'],
    queryFn: () => api.get<any>('/recession-probability'),
    staleTime: 60 * 60 * 1000,
  });
}
