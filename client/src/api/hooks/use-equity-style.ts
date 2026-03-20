import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEquityStyle() {
  return useQuery({
    queryKey: ['equity-style'],
    queryFn: () => api.get<any>('/equity-style'),
    staleTime: 60 * 60 * 1000,
  });
}
