import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, User } from '@/types/auth';

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            login: (token: string, user: User) =>
                set({ token, user, isAuthenticated: true }),
            logout: () => set({ token: null, user: null, isAuthenticated: false }),
            updateUser: (patch) =>
                set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
        }),
        {
            name: 'auth-storage',
        }
    )
);

// Los archivos (OITs, cotizaciones, informes) se abren con enlaces directos del navegador, donde
// no viaja la cabecera Authorization. Se mantiene una cookie de sesion del mismo sitio, sincronizada
// con el login, para que el servidor pueda exigir sesion tambien en esas descargas.
const SESSION_COOKIE = 'als_session';
function syncSessionCookie(token: string | null) {
    if (typeof document === 'undefined') return;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = token
        ? `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Strict${secure}`
        : `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict${secure}`;
}
syncSessionCookie(useAuthStore.getState().token);
useAuthStore.subscribe((state) => syncSessionCookie(state.token));
