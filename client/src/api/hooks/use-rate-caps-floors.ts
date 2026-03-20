import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRateCapsFloors() {
  return useQuery({
    queryKey: ['rate-caps-floors'],
    queryFn: () => api.get<any>('/rate-caps-floors'),
    staleTime: 60 * 60 * 1000,
  });
}
