import { useEffect, useState } from 'react';

export function useAsyncData<T>(loadData: () => Promise<T[]>, defaultErrorMessage: string) {
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);
                setData(await loadData());
            } catch (err: unknown) {
                const responseMessage = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
                setError(responseMessage || defaultErrorMessage);
                setData([]);
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [loadData, defaultErrorMessage]);

    return { data, isLoading, error };
}
