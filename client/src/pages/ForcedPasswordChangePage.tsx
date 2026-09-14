import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/features/auth/authStore';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';

export default function ForcedPasswordChangePage() {
    const updateUser = useAuthStore((state) => state.updateUser);

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md border-slate-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle>Cambia tu contraseña para continuar</CardTitle>
                    <CardDescription>
                        Por seguridad, debes reemplazar tu contraseña temporal antes de usar la plataforma.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChangePasswordForm onSuccess={() => updateUser({ mustChangePassword: false })} />
                </CardContent>
            </Card>
        </div>
    );
}
