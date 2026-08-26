import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { AuthCard } from '@/components/auth/AuthCard';
import { FormErrorAlert } from '@/components/auth/FormErrorAlert';
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton';
const formSchema = z.object({
    email: z.string().email({
        message: 'Por favor ingresa un correo electrónico válido.'
    })
});
export default function ForgotPasswordPage() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: ''
        }
    });
    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setError(null);
        try {
            await api.post('/auth/forgot-password', values);
            setSent(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al procesar la solicitud');
        } finally {
            setIsLoading(false);
        }
    }
    return (
        <AuthCard
            title="Recuperar contraseña"
            description="Ingresa tu correo y te mostraremos un link para definir una nueva contraseña"
            footer={
                <p className="text-sm text-slate-500">
                    <Link to="/login" className="text-slate-900 hover:underline font-medium">
                        Volver a inicio de sesión
                    </Link>
                </p>
            }
        >
            {sent ? (
                <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-3">
                    Si el correo existe en el sistema, te enviamos un link de recuperación. Revisa tu bandeja de entrada
                    (y la carpeta de spam) durante la próxima hora.
                </div>
            ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700">Correo Electrónico</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="nombre@ejemplo.com"
                                            {...field}
                                            className="bg-white border-slate-200 focus:border-slate-400 focus:ring-0"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormErrorAlert error={error} />
                        <AuthSubmitButton isLoading={isLoading} label="Generar link de recuperación" />
                    </form>
                </Form>
            )}
        </AuthCard>
    );
}
