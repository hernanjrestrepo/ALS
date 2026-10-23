import { useState, useEffect } from 'react';
import { fetchOITs } from '@/lib/api';

export interface OIT {
    id: string;
    oitNumber?: string;
    description?: string;
    clientName?: string;
    clientNit?: string;
    quotationRef?: string;
    location?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export function useOITs(searchQuery?: string, sortBy?: string, sortDir?: string) {
    const [oits, setOits] = useState<OIT[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Solo cuenta la respuesta de la ultima peticion (las anteriores pueden llegar despues).
        let current = true;
        const loadOITs = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await fetchOITs(searchQuery, sortBy, sortDir);
                if (current) setOits(data);
            } catch (err: any) {
                if (!current) return;
                setError(err.response?.data?.message || 'Error al cargar OITs');
                setOits([]);
            } finally {
                if (current) setIsLoading(false);
            }
        };

        loadOITs();
        return () => { current = false; };
    }, [searchQuery, sortBy, sortDir]);

    return { oits, isLoading, error };
}
