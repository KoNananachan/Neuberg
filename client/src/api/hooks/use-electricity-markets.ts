import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useElectricityMarkets() {
  return useQuery({
    queryKey: ['electricity-markets'],
    queryFn: () => api.get<any>('/electricity-markets'),
    staleTime: 60 * 60 * 1000,
  });
}
