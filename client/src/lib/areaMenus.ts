// Perfiles por area (Hernan, 23-oct: "crear perfiles para los usuarios y organicemos el
// menu funcionalmente"). Que rutas del menu ve cada area del listado de personal. Los
// administradores ven todo. Es solo el menu: los permisos del servidor no cambian.
export const AREA_MENUS: Record<string, string[]> = {
    'Comercial': ['/', '/clients', '/services', '/quotations', '/distribution-lists', '/parameter-consultations', '/oits', '/calendar', '/ai', '/notifications', '/academy', '/settings'],
    'Operaciones': ['/', '/oits', '/calendar', '/resources', '/sampling-templates', '/standards', '/ai', '/notifications', '/academy', '/settings'],
    'Laboratorio': ['/', '/lab', '/oits', '/quotations', '/calendar', '/standards', '/ai', '/notifications', '/academy', '/settings'],
    'Direccion Tecnica': ['/', '/quotations', '/oits', '/calendar', '/resources', '/sampling-templates', '/standards', '/analytics', '/ai', '/notifications', '/academy', '/settings'],
    'Consultoria': ['/', '/quotations', '/oits', '/calendar', '/sampling-templates', '/standards', '/analytics', '/ai', '/notifications', '/academy', '/settings'],
    'Sistema Integrado De Gestion': ['/', '/oits', '/standards', '/analytics', '/ai', '/notifications', '/academy', '/settings'],
    'Infraestructura Tecnologica': ['/', '/oits', '/calendar', '/resources', '/ai', '/notifications', '/academy', '/settings'],
};

// Rutas permitidas para el usuario; null = sin filtro (administrador o area desconocida).
// Rol de laboratorio: su menu es el de laboratorio aunque su area no este en el listado.
export function allowedMenuHrefs(role?: string | null, area?: string | null): Set<string> | null {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return null;
    if (role === 'LAB') return new Set(AREA_MENUS['Laboratorio']);
    const list = area ? AREA_MENUS[area] : undefined;
    return list ? new Set(list) : null;
}
