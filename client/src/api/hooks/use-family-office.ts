import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFamilyOffice() {
  return useQuery({
    queryKey: ['family-office'],
    queryFn: () => api.get<any>('/family-office'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
