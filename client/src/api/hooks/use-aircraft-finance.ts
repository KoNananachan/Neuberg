import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useAircraftFinance() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['aircraft-finance'],
    queryFn: () => api.get<any>('/aircraft-finance'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
