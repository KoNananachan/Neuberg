import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDividendCalendar() {
  return useQuery({
    queryKey: ['dividend-calendar'],
    queryFn: () => api.get<any>('/dividend-calendar'),
    staleTime: 60 * 60 * 1000,
  });
}
