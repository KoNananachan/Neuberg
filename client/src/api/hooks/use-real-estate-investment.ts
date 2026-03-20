import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRealEstateInvestment() {
  return useQuery({
    queryKey: ['real-estate-investment'],
    queryFn: () => api.get<any>('/real-estate-investment'),
    staleTime: 60 * 60 * 1000,
  });
}
