import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCrossAssetMomentum() {
  return useQuery({
    queryKey: ['cross-asset-momentum'],
    queryFn: () => api.get<any>('/cross-asset-momentum'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
