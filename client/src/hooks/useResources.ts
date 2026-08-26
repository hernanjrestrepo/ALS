import { useCallback } from 'react';
import { useAsyncData } from './useAsyncData';
import { fetchResources } from '@/lib/api';

export interface Resource {
    id: string;
    name: string;
    type: string;
    quantity: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export function useResources(searchQuery?: string) {
    const loadResources = useCallback(() => fetchResources(searchQuery), [searchQuery]);
    const { data, isLoading, error } = useAsyncData<Resource>(loadResources, 'Error al cargar recursos');
    return { resources: data, isLoading, error };
}
