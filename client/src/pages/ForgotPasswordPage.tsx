import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ArrowRight, Loader2 } from 'lucide-react';
import { ParadixeFooter } from '@/components/brand/ParadixeFooter';

const formSchema = z.object({
    email: z.string().email({
        message: 'Por favor ingresa un correo electrónico válido.',
    }),
});

export default function ForgotPasswordPage() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: '' },
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
        <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-slate-50 gap-4">
            <Card className="w-full max-w-[400px] shadow-none border-slate-200">
                <CardHeader className="space-y-1 text-center pb-8">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden">
                            <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
                        </div>
                    </div>
                    <CardTitle className="text-xl font-semibold text-slate-900">
                        Recuperar contraseña
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        Ingresa tu correo y te mostraremos un link para definir una nueva contraseña
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {sent ? (
                        <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-3">
                            Si el correo existe en el sistema, te enviamos un link de recuperación.
                            Revisa tu bandeja de entrada (y la carpeta de spam) durante la próxima hora.
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
                                {error && (
                                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                                        {error}
                                    </div>
                                )}
                                <Button
                                    type="submit"
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            Generar link de recuperación
                                            <ArrowRight className="h-4 w-4" />
                                        </span>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    )}
                </CardContent>
                <CardFooter className="justify-center border-t border-slate-100 pt-6">
                    <p className="text-sm text-slate-500">
                        <Link to="/login" className="text-slate-900 hover:underline font-medium">
                            Volver a inicio de sesión
                        </Link>
                    </p>
                </CardFooter>
            </Card>
            <ParadixeFooter />
        </div>
    );
}
