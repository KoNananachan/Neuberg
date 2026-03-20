import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityShortInterest() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['equity-short-interest'],
    queryFn: () => api.get<any>('/equity-short-interest'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
