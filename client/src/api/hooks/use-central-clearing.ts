import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCentralClearing() {
  return useQuery({
    queryKey: ['central-clearing'],
    queryFn: () => api.get<any>('/central-clearing'),
    staleTime: 60 * 60 * 1000,
  });
}
