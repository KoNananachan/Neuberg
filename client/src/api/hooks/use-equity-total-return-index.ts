import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityTotalReturnIndex() {
  return useQuery({
    queryKey: ['equity-total-return-index'],
    queryFn: () => api.get<any>('/equity-total-return-index'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
