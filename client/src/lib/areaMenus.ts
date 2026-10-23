// Perfiles por area (Hernan, 23-oct: "crear perfiles para los usuarios y organicemos el
// menu funcionalmente"). Que rutas del menu ve cada area del listado de personal. Los
// administradores ven todo. Es solo el menu: los permisos del servidor no cambian.
export const AREA_MENUS: Record<string, string[]> = {
    'Comercial': ['/', '/clients', '/services', '/quotations', '/distribution-lists', '/parameter-consultations', '/oits', '/calendar', '/ai', '/notifications', '/settings'],
    'Operaciones': ['/', '/oits', '/calendar', '/resources', '/sampling-templates', '/standards', '/ai', '/notifications', '/settings'],
    'Laboratorio': ['/', '/oits', '/calendar', '/standards', '/ai', '/notifications', '/settings'],
    'Direccion Tecnica': ['/', '/quotations', '/oits', '/calendar', '/resources', '/sampling-templates', '/standards', '/analytics', '/ai', '/notifications', '/settings'],
    'Consultoria': ['/', '/quotations', '/oits', '/calendar', '/sampling-templates', '/standards', '/analytics', '/ai', '/notifications', '/settings'],
    'Sistema Integrado De Gestion': ['/', '/oits', '/standards', '/analytics', '/ai', '/notifications', '/settings'],
    'Infraestructura Tecnologica': ['/', '/oits', '/calendar', '/resources', '/ai', '/notifications', '/settings'],
};

// Rutas permitidas para el usuario; null = sin filtro (administrador o area desconocida).
export function allowedMenuHrefs(role?: string | null, area?: string | null): Set<string> | null {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return null;
    const list = area ? AREA_MENUS[area] : undefined;
    return list ? new Set(list) : null;
}
