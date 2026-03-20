import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRealEstateCapital() {
  return useQuery({
    queryKey: ['real-estate-capital'],
    queryFn: () => api.get<any>('/real-estate-capital'),
    staleTime: 60 * 60 * 1000,
  });
}
