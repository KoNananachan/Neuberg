import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFreightDerivatives() {
  return useQuery({
    queryKey: ['freight-derivatives'],
    queryFn: () => api.get<any>('/freight-derivatives'),
    staleTime: 60 * 60 * 1000,
  });
}
