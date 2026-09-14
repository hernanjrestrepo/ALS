import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/authStore';
import api from '@/lib/api';

export default function SettingsPage() {
    const user = useAuthStore((state) => state.user);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [changingPassword, setChangingPassword] = useState(false);

    const handleChangePassword = async () => {
        setPasswordMessage(null);
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'La nueva contraseña y su confirmación no coinciden' });
            return;
        }
        setChangingPassword(true);
        try {
            await api.put('/users/me/password', { currentPassword, newPassword });
            setPasswordMessage({ type: 'success', text: 'Contraseña actualizada exitosamente' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setPasswordMessage({ type: 'error', text: error?.response?.data?.error || 'Error al actualizar la contraseña' });
        } finally {
            setChangingPassword(false);
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
                            value={user.role || 'Usuario'}
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
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="currentPassword">Contraseña actual</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="newPassword">Nueva contraseña</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    {passwordMessage && (
                        <p className={passwordMessage.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
                            {passwordMessage.text}
                        </p>
                    )}
                    <Button
                        onClick={handleChangePassword}
                        disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                    >
                        {changingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                    </Button>
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
                        <Button variant="outline" size="sm">Configurar</Button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Notificaciones push</p>
                            <p className="text-sm text-slate-500">Recibe notificaciones en el navegador</p>
                        </div>
                        <Button variant="outline" size="sm">Configurar</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
