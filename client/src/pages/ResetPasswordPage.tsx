import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { AuthCard } from '@/components/auth/AuthCard';
import { FormErrorAlert } from '@/components/auth/FormErrorAlert';
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton';
const formSchema = z.object({ password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }), confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { message: 'Las contraseñas no coinciden.', path: ['confirmPassword'] });
export default function ResetPasswordPage() {
    const navigate = useNavigate(); const [searchParams] = useSearchParams(); const token = searchParams.get('token') || ''; const email = searchParams.get('email') || ''; const [error, setError] = useState<string | null>(null); const [isLoading, setIsLoading] = useState(false); const [success, setSuccess] = useState(false);
    const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { password: '', confirmPassword: '' } });
    async function onSubmit(values: z.infer<typeof formSchema>) { setIsLoading(true); setError(null); try { await api.post('/auth/reset-password', { email, token, password: values.password }); setSuccess(true); setTimeout(() => navigate('/login'), 2500); } catch (err: any) { setError(err.response?.data?.message || 'Error al restablecer la contraseña'); } finally { setIsLoading(false); } }
    if (!token || !email) return <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-slate-50 gap-4"><Card className="w-full max-w-[400px] shadow-none border-slate-200"><CardHeader className="text-center"><CardTitle className="text-xl font-semibold text-slate-900">Link inválido</CardTitle><CardDescription className="text-slate-500">Este link de recuperación no es válido. Solicita uno nuevo.</CardDescription></CardHeader><CardFooter className="justify-center"><Link to="/forgot-password" className="text-slate-900 hover:underline font-medium text-sm">Solicitar nuevo link</Link></CardFooter></Card></div>;
    return <AuthCard wrapperClassName="flex min-h-screen items-center justify-center p-4 bg-slate-50" title="Nueva contraseña" description={<>Define una nueva contraseña para {email}</>}>
        {success ? <div className="flex flex-col items-center gap-3 py-4 text-center"><CheckCircle2 className="h-10 w-10 text-emerald-600" /><p className="text-sm text-slate-700">Contraseña actualizada. Redirigiendo a inicio de sesión...</p></div> : <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4"><FormField control={form.control} name="password" render={({ field }) => <FormItem><FormLabel className="text-slate-700">Nueva contraseña</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} className="bg-white border-slate-200 focus:border-slate-400 focus:ring-0" /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="confirmPassword" render={({ field }) => <FormItem><FormLabel className="text-slate-700">Confirmar contraseña</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} className="bg-white border-slate-200 focus:border-slate-400 focus:ring-0" /></FormControl><FormMessage /></FormItem>} /><FormErrorAlert error={error} /><AuthSubmitButton isLoading={isLoading} label="Guardar nueva contraseña" /></form></Form>}
    </AuthCard>;
}
