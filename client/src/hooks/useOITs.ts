import { useCallback } from 'react';
import { useAsyncData } from './useAsyncData';
import { fetchOITs } from '@/lib/api';

export interface OIT {
    id: string;
    oitNumber?: string;
    description?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export function useOITs(searchQuery?: string) {
    const loadOITs = useCallback(() => fetchOITs(searchQuery), [searchQuery]);
    const { data, isLoading, error } = useAsyncData<OIT>(loadOITs, 'Error al cargar OITs');
    return { oits: data, isLoading, error };
}
