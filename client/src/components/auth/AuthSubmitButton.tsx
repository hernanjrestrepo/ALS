import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthSubmitButtonProps {
    isLoading: boolean;
    label: string;
}

export function AuthSubmitButton({ isLoading, label }: AuthSubmitButtonProps) {
    return (
        <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white" disabled={isLoading}>
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <span className="flex items-center justify-center gap-2">
                    {label}
                    <ArrowRight className="h-4 w-4" />
                </span>
            )}
        </Button>
    );
}
