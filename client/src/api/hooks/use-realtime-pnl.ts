import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRealtimePnl() {
  return useQuery({
    queryKey: ['realtime-pnl'],
    queryFn: () => api.get<any>('/realtime-pnl'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
