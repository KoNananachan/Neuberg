import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityLending() {
  return useQuery({
    queryKey: ['equity-lending'],
    queryFn: () => api.get<any>('/equity-lending'),
    staleTime: 60 * 60 * 1000,
  });
}
