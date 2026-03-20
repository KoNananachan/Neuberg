import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEquityScreenResults() {
  return useQuery({
    queryKey: ['equity-screen-results'],
    queryFn: () => api.get<any>('/equity-screen-results'),
    staleTime: 60 * 60 * 1000,
  });
}
