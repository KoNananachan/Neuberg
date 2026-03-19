import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCybersecurity() {
  return useQuery({
    queryKey: ['cybersecurity'],
    queryFn: () => api.get<any>('/cybersecurity'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
