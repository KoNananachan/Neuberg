import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRealEstateInvestment() {
  return useQuery({
    queryKey: ['real-estate-investment'],
    queryFn: () => api.get<any>('/real-estate-investment'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
