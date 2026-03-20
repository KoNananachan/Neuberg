import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useAgencyDebt() {
  return useQuery({
    queryKey: ['agency-debt'],
    queryFn: () => api.get<any>('/agency-debt'),
    staleTime: 180000,
  });
}
