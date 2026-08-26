import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { AuthResponse } from '@/types/auth';
import { AuthCard } from '@/components/auth/AuthCard';
import { FormErrorAlert } from '@/components/auth/FormErrorAlert';
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton';

const formSchema = z.object({
    email: z.string().email({ message: 'Por favor ingresa un correo electrónico válido.' }),
    password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
});

export default function RegisterPage() {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { email: '', password: '' } });
    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true); setError(null);
        try { const response = await api.post<AuthResponse>('/auth/register', values); login(response.data.token, response.data.user); navigate('/'); }
        catch (err: any) { setError(err.response?.data?.message || 'Error al crear la cuenta'); }
        finally { setIsLoading(false); }
    }
    return <AuthCard title="Crear una cuenta" description="Ingresa tu correo electrónico para crear tu cuenta" footer={<p className="text-sm text-slate-500">¿Ya tienes una cuenta?{' '}<Link to="/login" className="text-slate-900 hover:underline font-medium">Inicia sesión</Link></p>}>
        <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel className="text-slate-700">Correo Electrónico</FormLabel><FormControl><Input placeholder="nombre@ejemplo.com" {...field} className="bg-white border-slate-200 focus:border-slate-400 focus:ring-0" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="password" render={({ field }) => <FormItem><FormLabel className="text-slate-700">Contraseña</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} className="bg-white border-slate-200 focus:border-slate-400 focus:ring-0" /></FormControl><FormMessage /></FormItem>} />
            <FormErrorAlert error={error} /><AuthSubmitButton isLoading={isLoading} label="Registrarse" />
        </form></Form>
    </AuthCard>;
}
