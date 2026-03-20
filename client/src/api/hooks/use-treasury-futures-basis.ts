import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTreasuryFuturesBasis() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['treasury-futures-basis'],
    queryFn: () => api.get<any>('/treasury-futures-basis'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
