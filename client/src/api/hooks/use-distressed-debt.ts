import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDistressedDebt() {
  return useQuery({
    queryKey: ['distressed-debt'],
    queryFn: () => api.get<any>('/distressed-debt'),
    staleTime: 60 * 60 * 1000,
  });
}
