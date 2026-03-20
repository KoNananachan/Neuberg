import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEquityFinancing() {
  return useQuery({
    queryKey: ['equity-financing'],
    queryFn: () => api.get<any>('/equity-financing'),
    staleTime: 60 * 60 * 1000,
  });
}
