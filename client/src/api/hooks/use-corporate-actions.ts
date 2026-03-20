import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCorporateActions() {
  return useQuery({
    queryKey: ['corporate-actions'],
    queryFn: () => api.get<any>('/corporate-actions'),
    staleTime: 60 * 60 * 1000,
  });
}
