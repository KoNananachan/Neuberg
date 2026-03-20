import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMortgagePrepayment() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mortgage-prepayment'],
    queryFn: () => api.get<any>('/mortgage-prepayment'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
