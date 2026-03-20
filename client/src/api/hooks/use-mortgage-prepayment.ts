import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMortgagePrepayment() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mortgage-prepayment'],
    queryFn: () => api.get<any>('/mortgage-prepayment'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
