import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCybersecurity() {
  return useQuery({
    queryKey: ['cybersecurity'],
    queryFn: () => api.get<any>('/cybersecurity'),
    staleTime: 60 * 60 * 1000,
  });
}
