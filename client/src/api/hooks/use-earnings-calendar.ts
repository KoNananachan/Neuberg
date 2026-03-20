import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEarningsCalendar() {
  return useQuery({
    queryKey: ['earnings-calendar'],
    queryFn: () => api.get<any>('/earnings-calendar'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
