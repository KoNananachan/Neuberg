import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCentralBank() {
  return useQuery({
    queryKey: ['central-bank'],
    queryFn: () => api.get<any>('/central-bank'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
