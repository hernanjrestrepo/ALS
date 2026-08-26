import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ParadixeFooter } from '@/components/brand/ParadixeFooter';

interface AuthCardProps {
    title: ReactNode;
    description: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    wrapperClassName?: string;
}

export function AuthCard({ title, description, children, footer, wrapperClassName = 'flex flex-col min-h-screen items-center justify-center p-4 bg-slate-50 gap-4' }: AuthCardProps) {
    return (
        <div className={wrapperClassName}>
            <Card className="w-full max-w-[400px] shadow-none border-slate-200">
                <CardHeader className="space-y-1 text-center pb-8">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden">
                            <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
                        </div>
                    </div>
                    <CardTitle className="text-xl font-semibold text-slate-900">
                        {title}
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        {description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {children}
                </CardContent>
                {footer && (
                    <CardFooter className="justify-center border-t border-slate-100 pt-6">
                        {footer}
                    </CardFooter>
                )}
            </Card>
            <ParadixeFooter />
        </div>
    );
}
