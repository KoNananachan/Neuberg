import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useGlobalMacroDashboard() {
  return useQuery({
    queryKey: ['global-macro-dashboard'],
    queryFn: () => api.get<any>('/global-macro-dashboard'),
    staleTime: 60 * 60 * 1000,
  });
}
