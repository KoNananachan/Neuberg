import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRareEarthBatteryMetals() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['rare-earth-battery-metals'],
    queryFn: () => api.get<any>('/rare-earth-battery-metals'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
