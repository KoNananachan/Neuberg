import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCentralClearing() {
  return useQuery({
    queryKey: ['central-clearing'],
    queryFn: () => api.get<any>('/central-clearing'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
