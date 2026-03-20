import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFamilyOffice() {
  return useQuery({
    queryKey: ['family-office'],
    queryFn: () => api.get<any>('/family-office'),
    staleTime: 60 * 60 * 1000,
  });
}
