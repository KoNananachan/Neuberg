import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePrimeBrokerage() {
  return useQuery({
    queryKey: ['prime-brokerage'],
    queryFn: () => api.get<any>('/prime-brokerage'),
    staleTime: 60 * 60 * 1000,
  });
}
