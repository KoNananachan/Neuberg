import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCentralBank() {
  return useQuery({
    queryKey: ['central-bank'],
    queryFn: () => api.get<any>('/central-bank'),
    staleTime: 180000,
  });
}
