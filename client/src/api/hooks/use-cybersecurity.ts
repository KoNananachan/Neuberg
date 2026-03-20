import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCybersecurity() {
  return useQuery({
    queryKey: ['cybersecurity'],
    queryFn: () => api.get<any>('/cybersecurity'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
