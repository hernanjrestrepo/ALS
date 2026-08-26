import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
    status: string;
    styles: Record<string, string>;
    labels: Record<string, string>;
}

export function StatusBadge({ status, styles, labels }: StatusBadgeProps) {
    return <Badge className={`${styles[status] || styles.PENDING} hover:${styles[status]}`}>{labels[status] || status}</Badge>;
}
