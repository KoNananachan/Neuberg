import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTaxLossHarvest() {
  return useQuery({
    queryKey: ['tax-loss-harvest'],
    queryFn: () => api.get<any>('/tax-loss-harvest'),
    staleTime: 60 * 60 * 1000,
  });
}
