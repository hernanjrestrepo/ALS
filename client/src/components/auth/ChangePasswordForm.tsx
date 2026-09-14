import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

export function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setMessage(null);
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'La nueva contraseña y su confirmación no coinciden' });
            return;
        }
        setLoading(true);
        try {
            await api.put('/users/me/password', { currentPassword, newPassword });
            setMessage({ type: 'success', text: 'Contraseña actualizada exitosamente' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onSuccess?.();
        } catch (error: any) {
            setMessage({ type: 'error', text: error?.response?.data?.error || 'Error al actualizar la contraseña' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
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
            {message && (
                <p className={message.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
                    {message.text}
                </p>
            )}
            <Button
                onClick={handleSubmit}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            >
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
        </div>
    );
}
