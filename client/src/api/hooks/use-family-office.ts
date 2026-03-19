import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFamilyOffice() {
  return useQuery({
    queryKey: ['family-office'],
    queryFn: () => api.get<any>('/family-office'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
