import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/authStore';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { tr } from '@/i18n';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
// Mismo mapeo que UsersPage.tsx (el rol se mostraba crudo, ej. "SUPER_ADMIN")
const ROLE_LABELS: Record<string, string> = {
    'SUPER_ADMIN': tr("Super Administrador"),
    'ADMIN': tr("Administrador"),
    'ENGINEER': tr("Ingeniero de Campo"),
    'USER': tr("Usuario")
};

export default function SettingsPage() {
    const user = useAuthStore((state) => state.user);
    const push = usePushNotifications();

    const handlePushClick = async () => {
        if (push.isSubscribed) {
            const ok = await push.unsubscribe();
            if (ok) toast.success(tr("Notificaciones push desactivadas"));
            else toast.error(tr("No se pudieron desactivar las notificaciones push"));
        } else {
            const ok = await push.subscribe();
            if (ok) toast.success(tr("Notificaciones push activadas"));
            else if (push.permission === 'denied') toast.error(tr("El navegador tiene bloqueadas las notificaciones para este sitio. Actívalas desde el candado en la barra de direcciones."));
            else toast.error(tr("No se pudo activar las notificaciones push"));
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">{tr("Cargando información del usuario...")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{tr("Configuración")}</h2>
                <p className="text-slate-500">{tr("Gestiona tu perfil y preferencias.")}</p>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle>{tr("Perfil")}</CardTitle>
                    <CardDescription>{tr("Información de tu cuenta")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{tr("Nombre")}</Label>
                        <Input
                            id="name"
                            value={user.name || 'Sin nombre'}
                            disabled
                            className="bg-slate-50"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">{tr("Correo Electrónico")}</Label>
                        <Input
                            id="email"
                            value={user.email}
                            disabled
                            className="bg-slate-50"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="role">{tr("Rol")}</Label>
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
                    <CardTitle>{tr("Idioma")}</CardTitle>
                    <CardDescription>{tr("Idioma de la plataforma en este navegador. Ana también te responde en este idioma.")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <LanguageSelector />
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle>{tr("Cambiar contraseña")}</CardTitle>
                    <CardDescription>{tr("Actualiza tu contraseña de acceso")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChangePasswordForm />
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle>{tr("Notificaciones")}</CardTitle>
                    <CardDescription>{tr("Configura cómo deseas recibir notificaciones")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">{tr("Notificaciones por correo")}</p>
                            <p className="text-sm text-slate-500">{tr("Recibe actualizaciones por email")}</p>
                        </div>
                        {/* Todavia no existe backend para preferencias de correo - antes
                            este boton no hacia nada al hacer clic; se deja deshabilitado
                            en vez de simular una funcion que no existe. */}
                        <Button variant="outline" size="sm" disabled title={tr("Próximamente")}>{tr("Próximamente")}</Button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">{tr("Notificaciones push")}</p>
                            <p className="text-sm text-slate-500">
                                {!push.isSupported ? tr("Tu navegador no soporta notificaciones push")
                                    : push.isSubscribed ? tr("Activas en este navegador")
                                        : tr("Recibe notificaciones en el navegador")}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" disabled={!push.isSupported || push.loading} onClick={handlePushClick}>
                            {push.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : push.isSubscribed ? tr("Desactivar") : tr("Activar")}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
