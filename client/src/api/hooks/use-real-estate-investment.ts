import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRealEstateInvestment() {
  return useQuery({
    queryKey: ['real-estate-investment'],
    queryFn: () => api.get<any>('/real-estate-investment'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
