import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface DashboardStats {
    totalOITs: number;
    completedOITs: number;
    inProgressOITs: number;
    pendingOITs: number;
    totalResources: number;
    availableResources: number;
    recentOITs: any[];
    statusBreakdown: { status: string; label: string; count: number }[];
    monthlyTrend: { month: string; count: number }[];
    stuckOITs: any[];
}

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendiente',
    ANALYZING: 'Analizando',
    REVIEW_REQUIRED: 'Revisión requerida',
    SCHEDULED: 'Programada',
    IN_PROGRESS: 'En progreso',
    COMPLETED: 'Completada',
};

const STUCK_STATUSES = ['REVIEW_REQUIRED', 'PENDING', 'ANALYZING'];
const STUCK_DAYS_THRESHOLD = 5;

export function useDashboardStats() {
    const [stats, setStats] = useState<DashboardStats>({
        totalOITs: 0,
        completedOITs: 0,
        inProgressOITs: 0,
        pendingOITs: 0,
        totalResources: 0,
        availableResources: 0,
        recentOITs: [],
        statusBreakdown: [],
        monthlyTrend: [],
        stuckOITs: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [oitsRes, resourcesRes] = await Promise.all([
                    api.get('/oits'),
                    api.get('/resources')
                ]);

                const oits = oitsRes.data;
                const resources = resourcesRes.data;

                const counts: Record<string, number> = {};
                oits.forEach((o: any) => {
                    counts[o.status] = (counts[o.status] || 0) + 1;
                });
                const statusBreakdown = Object.entries(counts)
                    .map(([status, count]) => ({ status, label: STATUS_LABELS[status] || status, count }))
                    .sort((a, b) => b.count - a.count);

                const now = new Date();
                const monthBuckets: Record<string, number> = {};
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const key = d.toLocaleDateString('es-CO', { month: 'short' });
                    monthBuckets[key] = 0;
                }
                oits.forEach((o: any) => {
                    const d = new Date(o.createdAt);
                    const key = d.toLocaleDateString('es-CO', { month: 'short' });
                    if (key in monthBuckets) monthBuckets[key]++;
                });
                const monthlyTrend = Object.entries(monthBuckets).map(([month, count]) => ({ month, count }));

                const stuckOITs = oits.filter((o: any) => {
                    if (!STUCK_STATUSES.includes(o.status)) return false;
                    const ageDays = (now.getTime() - new Date(o.updatedAt || o.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                    return ageDays >= STUCK_DAYS_THRESHOLD;
                });

                setStats({
                    totalOITs: oits.length,
                    completedOITs: oits.filter((o: any) => o.status === 'COMPLETED').length,
                    inProgressOITs: oits.filter((o: any) => o.status === 'IN_PROGRESS').length,
                    pendingOITs: oits.filter((o: any) => o.status === 'PENDING').length,
                    totalResources: resources.length,
                    availableResources: resources.filter((r: any) => r.status === 'AVAILABLE').length,
                    recentOITs: oits.slice(0, 5),
                    statusBreakdown,
                    monthlyTrend,
                    stuckOITs,
                });
            } catch (err) {
                console.error('Failed to fetch dashboard stats:', err);
                setError('Failed to load dashboard data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    return { stats, isLoading, error };
}
