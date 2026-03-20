import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCorporateActionCalendar() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['corporate-action-calendar'],
    queryFn: () => api.get<any>('/corporate-action-calendar'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
