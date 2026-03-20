import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCorporateActionCalendar() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['corporate-action-calendar'],
    queryFn: () => api.get<any>('/corporate-action-calendar'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
