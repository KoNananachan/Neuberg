import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAgencyMbsTba() {
  return useQuery({
    queryKey: ['agency-mbs-tba'],
    queryFn: () => api.get<any>('/agency-mbs-tba'),
    staleTime: 60 * 60 * 1000,
  });
}
