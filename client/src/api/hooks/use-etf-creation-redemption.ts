import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEtfCreationRedemption() {
  return useQuery({
    queryKey: ['etf-creation-redemption'],
    queryFn: () => api.get<any>('/etf-creation-redemption'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
