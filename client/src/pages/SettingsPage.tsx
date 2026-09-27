import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/authStore';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Mismo mapeo que UsersPage.tsx (el rol se mostraba crudo, ej. "SUPER_ADMIN")
const ROLE_LABELS: Record<string, string> = {
    'SUPER_ADMIN': 'Super Administrador',
    'ADMIN': 'Administrador',
    'ENGINEER': 'Ingeniero de Campo',
    'USER': 'Usuario'
};

export default function SettingsPage() {
    const user = useAuthStore((state) => state.user);
    const push = usePushNotifications();

    const handlePushClick = async () => {
        if (push.isSubscribed) {
            const ok = await push.unsubscribe();
            if (ok) toast.success('Notificaciones push desactivadas');
            else toast.error('No se pudieron desactivar las notificaciones push');
        } else {
            const ok = await push.subscribe();
            if (ok) toast.success('Notificaciones push activadas');
            else if (push.permission === 'denied') toast.error('El navegador tiene bloqueadas las notificaciones para este sitio. Actívalas desde el candado en la barra de direcciones.');
            else toast.error('No se pudo activar las notificaciones push');
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">Cargando información del usuario...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Configuración</h2>
                <p className="text-slate-500">Gestiona tu perfil y preferencias.</p>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle>Perfil</CardTitle>
                    <CardDescription>Información de tu cuenta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                            id="name"
                            value={user.name || 'Sin nombre'}
                            disabled
                            className="bg-slate-50"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                            id="email"
                            value={user.email}
                            disabled
                            className="bg-slate-50"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="role">Rol</Label>
                        <Input
                            id="role"
                            value={user.role ? (ROLE_LABELS[user.role] || user.role) : 'Usuario'}
                            disabled
                            className="bg-slate-50"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle>Cambiar contraseña</CardTitle>
                    <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChangePasswordForm />
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle>Notificaciones</CardTitle>
                    <CardDescription>Configura cómo deseas recibir notificaciones</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Notificaciones por correo</p>
                            <p className="text-sm text-slate-500">Recibe actualizaciones por email</p>
                        </div>
                        {/* Todavia no existe backend para preferencias de correo - antes
                            este boton no hacia nada al hacer clic; se deja deshabilitado
                            en vez de simular una funcion que no existe. */}
                        <Button variant="outline" size="sm" disabled title="Próximamente">Próximamente</Button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Notificaciones push</p>
                            <p className="text-sm text-slate-500">
                                {!push.isSupported ? 'Tu navegador no soporta notificaciones push'
                                    : push.isSubscribed ? 'Activas en este navegador'
                                        : 'Recibe notificaciones en el navegador'}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" disabled={!push.isSupported || push.loading} onClick={handlePushClick}>
                            {push.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : push.isSubscribed ? 'Desactivar' : 'Activar'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
