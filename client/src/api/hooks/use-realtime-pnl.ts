import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRealtimePnl() {
  return useQuery({
    queryKey: ['realtime-pnl'],
    queryFn: () => api.get<any>('/realtime-pnl'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
