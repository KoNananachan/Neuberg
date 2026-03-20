import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCrossAssetCorrelation() {
  return useQuery({
    queryKey: ['cross-asset-correlation'],
    queryFn: () => api.get<any>('/cross-asset-correlation'),
    staleTime: 60 * 60 * 1000,
  });
}
