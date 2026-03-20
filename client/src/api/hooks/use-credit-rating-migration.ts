import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCreditRatingMigration() {
  return useQuery({
    queryKey: ['credit-rating-migration'],
    queryFn: () => api.get<any>('/credit-rating-migration'),
    staleTime: 60 * 60 * 1000,
  });
}
