import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useGlobalPmiDashboard() {
  return useQuery({
    queryKey: ['global-pmi-dashboard'],
    queryFn: () => api.get<any>('/global-pmi-dashboard'),
    staleTime: 60 * 60 * 1000,
  });
}
