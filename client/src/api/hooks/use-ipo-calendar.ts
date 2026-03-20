import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useIpoCalendar() {
  return useQuery({
    queryKey: ['ipo-calendar'],
    queryFn: () => api.get<any>('/ipo-calendar'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
