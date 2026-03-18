import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSwaptionVol() {
  return useQuery({
    queryKey: ['swaption-vol'],
    queryFn: () => api.get<any>('/swaption-vol'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
