import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface ConflictEvent {
  name: string;
  lat: number;
  lng: number;
  count: number;
  url: string;
  title: string;
}

export function useConflicts() {
  return useQuery({
    queryKey: ['conflicts'],
    queryFn: () => api.get<ConflictEvent[]>('/conflicts'),
    staleTime: 60 * 60 * 1000,      // 3 min — data is fresh for this long
    gcTime: 10 * 60 * 1000,        // 10 min garbage collection
    refetchOnWindowFocus: false,     // Avoid redundant refetches on tab switch
    retry: 2,                        // Retry failed requests twice
  });
}
