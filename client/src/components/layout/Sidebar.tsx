import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    FileText,
    BarChart3,
    Box,
    Settings,
    LogOut,
    X,
    Sparkles,
    Bell,
    Calendar,
    Scale,
    Workflow,
    Users,
    Receipt,
    Building2,
    Beaker,
    ChevronDown,
    Mail,
    HelpCircle,
    HardHat,
    GraduationCap,
    FlaskConical,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { canManageUsers } from '@/types/auth';
import { allowedMenuHrefs } from '@/lib/areaMenus';
import api from '@/lib/api';

import { tr } from '@/i18n';
// Menus en el orden del proceso de una orden y agrupados por funcion:
// lo comercial ocurre antes de la OIT, la operacion es la OIT en curso, la base tecnica es
// lo que la operacion usa, y al final el seguimiento y la administracion.
const getNavigationGroups = (userRole?: string) => {
    const admin = [];
    // Gestion de usuarios solo para SUPER_ADMIN
    if (userRole && canManageUsers(userRole as any)) {
        admin.push({ icon: Users, label: tr("Usuarios"), href: '/users' });
    }
    // Personal de monitoreo: lo administra Operaciones (Raul, ADMIN) y la gerencia.
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        admin.push({ icon: HardHat, label: tr("Personal de monitoreo"), href: '/monitoring-staff' });
    }
    admin.push({ icon: Settings, label: tr("Configuración"), href: '/settings' });

    return [
        { title: tr("Inicio"), items: [
            { icon: LayoutDashboard, label: tr("Panel de Control"), href: '/' },
            { icon: GraduationCap, label: tr("Xmart Academy"), href: '/academy' },
        ] },
        { title: tr("Comercial"), items: [
            { icon: Building2, label: tr("Clientes"), href: '/clients' },
            { icon: Beaker, label: tr("Servicios"), href: '/services' },
            { icon: Receipt, label: tr("Cotizaciones"), href: '/quotations' },
            { icon: Mail, label: tr("Listas de Distribución"), href: '/distribution-lists' },
            // Respuestas de equivalencias de parámetros: solo quien puede registrarlas (ADMIN o SUPER_ADMIN)
            ...(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' ? [{ icon: HelpCircle, label: tr("Consultas de parámetros"), href: '/parameter-consultations' }] : []),
        ] },
        { title: tr("Operación"), items: [
            { icon: FileText, label: tr('OITs'), href: '/oits' },
            ...(userRole === 'LAB' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' ? [{ icon: FlaskConical, label: tr("Laboratorio"), href: '/lab' }] : []),
            { icon: Calendar, label: tr("Calendario"), href: '/calendar' },
            { icon: Box, label: tr("Recursos"), href: '/resources' },
        ] },
        { title: tr("Base técnica"), items: [
            { icon: Workflow, label: tr("Plantillas"), href: '/sampling-templates' },
            { icon: Scale, label: tr("Normas"), href: '/standards' },
        ] },
        { title: tr("Seguimiento"), items: [
            { icon: BarChart3, label: tr("Analítica"), href: '/analytics' },
            { icon: Sparkles, label: tr("Asistente IA"), href: '/ai' },
            { icon: Bell, label: tr("Notificaciones"), href: '/notifications' },
        ] },
        { title: tr("Administración"), items: admin },
    ];
};

const COLLAPSED_KEY = 'als-menu-grupos-cerrados';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const unreadCount = useUnreadNotifications();

    // Grupos plegables: se recuerda cuales dejo cerrados cada persona en su navegador.
    // Area del listado de personal (la da el servidor): define el menu que se ve.
    const [area, setArea] = useState<string | null>(null);
    useEffect(() => {
        if (!user || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return;
        api.get('/users/profile').then(r => setArea(r.data?.area || null)).catch(() => setArea(null));
    }, [user?.id, user?.role]);
    const allowed = allowedMenuHrefs(user?.role, area);
    const groups = getNavigationGroups(user?.role)
        .map(g => ({ ...g, items: allowed ? g.items.filter(i => allowed.has(i.href)) : g.items }))
        .filter(g => g.items.length > 0);
    const isItemActive = (href: string) => href === '/' ? location.pathname === '/' : (location.pathname === href || location.pathname.startsWith(href + '/'));
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
        try { return JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '{}'); } catch { return {}; }
    });
    const toggleGroup = (title: string) => setCollapsed((prev) => {
        const next = { ...prev, [title]: !prev[title] };
        try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next)); } catch { /* sin almacenamiento: solo dura la sesion */ }
        return next;
    });
    // Al navegar a una pagina de un grupo cerrado, ese grupo se abre para que se vea donde esta
    useEffect(() => {
        const current = groups.find((g) => g.items.some((i) => isItemActive(i.href)));
        if (current && collapsed[current.title]) {
            setCollapsed((prev) => ({ ...prev, [current.title]: false }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-slate-900/50 lg:hidden transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 flex h-full w-[280px] flex-col bg-[#F9F9F9] border-r border-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full lg:w-0 lg:border-none lg:overflow-hidden"
            )}>
                {/* Branding */}
                <div className="h-20 flex items-center justify-between px-4 border-b border-slate-200/50">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt={tr("ALS")} className="h-12 w-12 object-contain flex-shrink-0" />
                        <div className="text-left">
                            <p className="text-base font-bold text-[#004CAB] leading-none tracking-tight">{tr("ALS")}</p>
                            <p className="text-xs text-slate-500 mt-1">{tr("Serambiente")}</p>
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
                        <X className="h-5 w-5 text-slate-500" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto py-5 px-3 space-y-3">
                    {/* Menus agrupados por funcion, en el orden del proceso */}
                    {groups.map((group) => {
                        const isCollapsed = !!collapsed[group.title];
                        const hasUnread = unreadCount > 0 && group.items.some((i) => i.href === '/notifications');
                        return (
                        <div key={group.title}>
                            <button
                                type="button"
                                onClick={() => toggleGroup(group.title)}
                                aria-expanded={!isCollapsed}
                                className="w-full flex items-center justify-between px-3 py-1 mb-1 rounded-md text-xs font-semibold text-slate-500 uppercase tracking-wider hover:bg-slate-200/50 hover:text-slate-700 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    {group.title}
                                    {isCollapsed && hasUnread && <span className="h-2 w-2 rounded-full bg-red-500" />}
                                </span>
                                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', isCollapsed && '-rotate-90')} />
                            </button>
                            <nav className={cn('space-y-0.5', isCollapsed && 'hidden')}>
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = isItemActive(item.href);
                                    const showBadge = item.href === '/notifications' && unreadCount > 0;

                                    return (
                                        <Link
                                            key={item.href}
                                            to={item.href}
                                            className={cn(
                                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                                isActive
                                                    ? 'bg-[#004CAB] text-white shadow-sm'
                                                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                                            )}
                                            onClick={() => window.innerWidth < 1024 && onClose()}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {item.label}
                                            {showBadge && (
                                                <span className="ml-auto h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                                                    {unreadCount > 9 ? '9+' : unreadCount}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                        );
                    })}
                </div>

                {/* User Profile */}
                <div className="p-4 border-t border-slate-200/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://avatar.vercel.sh/${user?.email}`} />
                                <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm">
                                <p className="font-medium text-slate-900">{user?.name || tr("Usuario")}</p>
                                <p className="text-xs text-slate-500 truncate max-w-[120px]">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
