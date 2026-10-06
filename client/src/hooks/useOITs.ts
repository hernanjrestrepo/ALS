import { useState, useEffect } from 'react';
import { fetchOITs } from '@/lib/api';

export interface OIT {
    id: string;
    oitNumber?: string;
    description?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export function useOITs(searchQuery?: string, sortBy?: string, sortDir?: string) {
    const [oits, setOits] = useState<OIT[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadOITs = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await fetchOITs(searchQuery, sortBy, sortDir);
                setOits(data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Error al cargar OITs');
                setOits([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadOITs();
    }, [searchQuery, sortBy, sortDir]);

    return { oits, isLoading, error };
}
