import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useWarrantConvertible() {
  return useQuery({
    queryKey: ['warrant-convertible'],
    queryFn: () => api.get<any>('/warrant-convertible'),
    staleTime: 60 * 60 * 1000,
  });
}
