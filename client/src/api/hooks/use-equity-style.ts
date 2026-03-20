import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEquityStyle() {
  return useQuery({
    queryKey: ['equity-style'],
    queryFn: () => api.get<any>('/equity-style'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
