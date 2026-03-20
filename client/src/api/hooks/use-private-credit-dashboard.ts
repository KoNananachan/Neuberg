import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePrivateCreditDashboard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['private-credit-dashboard'],
    queryFn: () => api.get<any>('/private-credit-dashboard'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
