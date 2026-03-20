import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFintechDigitalPayments() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fintech-digital-payments'],
    queryFn: () => api.get<any>('/fintech-digital-payments'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
