/**
 * Xmart Academy (Hernan, 2026-10-24): el entrenamiento de ALS Xmart. Una sola fuente para la
 * pantalla /academy y para Ana (el asistente).
 *
 * Cada modulo corresponde a una opcion del menu. `href` es la ruta de esa pantalla (boton "Ir al
 * modulo"); `fuentes` son las carpetas o archivos del codigo de esa pantalla: cuando cambian, el
 * servicio de propuestas (services/academyPropuestas.ts) le pide a la IA un borrador de
 * "novedad" que solo se publica si Hernan lo aprueba. `palabras` sirve para saber de que modulo
 * es una pregunta que le hicieron a Ana (preguntas frecuentes).
 *
 * Las capturas (client/public/academy/<key>.png) se toman con datos simulados con
 * client/scripts/academy-capturas.cjs; nunca con datos reales de clientes.
 */

export interface PasoAcademy {
    titulo: string;
    detalle: string;
}

export interface PreguntaAcademy {
    pregunta: string;
    respuesta: string;
}

export type GrupoAcademy = 'Fundamentos' | 'Comercial' | 'Operación' | 'Informes y calidad' | 'Base técnica' | 'Seguimiento' | 'Administración';

export interface ModuloAcademy {
    key: string;
    href: string | null;
    titulo: string;
    grupo: GrupoAcademy;
    /** Una linea: que es. */
    resumen: string;
    /** Para que sirve, en lenguaje de negocio. */
    paraQue: string;
    quienes: string[];
    pasos: PasoAcademy[];
    reglas: string[];
    preguntas: PreguntaAcademy[];
    /** Archivo de la captura en client/public/academy/ (si no existe, la pantalla no la muestra). */
    captura: string | null;
    fuentes: string[];
    palabras: string[];
}

export const GRUPOS_ACADEMY: GrupoAcademy[] = ['Fundamentos', 'Comercial', 'Operación', 'Informes y calidad', 'Base técnica', 'Seguimiento', 'Administración'];

export const MODULOS_ACADEMY: ModuloAcademy[] = [
    {
        key: 'als-xmart',
        href: '/',
        titulo: '¿Qué es ALS Xmart?',
        grupo: 'Fundamentos',
        resumen: 'La plataforma de ALS que lleva una solicitud desde la cotización hasta el informe firmado.',
        paraQue: 'ALS Xmart reúne en un solo lugar lo que antes vivía en correos, hojas de cálculo y carpetas: la cotización, la orden de trabajo (OIT), la programación del personal, el muestreo en campo, los resultados de laboratorio y el informe final. La inteligencia artificial lee los documentos, revisa el cumplimiento de las normas, propone la programación y redacta borradores; las personas revisan y deciden.',
        quienes: ['Todo el equipo de ALS'],
        pasos: [
            { titulo: '1. Cotización', detalle: 'Comercial carga la cotización (PDF). La IA la compara con la norma que aplica y marca lo que falta o sobra.' },
            { titulo: '2. OIT', detalle: 'Llega la orden de trabajo (OIT). Se carga el PDF y la IA extrae el cliente, los servicios, la ubicación y los recursos. Si trae número SIACOT, se vincula sola con su cotización.' },
            { titulo: '3. Programación', detalle: 'La IA propone fecha, hora y personal libre para cada servicio y avisa si faltan equipos. Operaciones acepta o ajusta.' },
            { titulo: '4. Muestreo', detalle: 'El técnico llena el formulario en el celular (funciona sin señal), toma las 5 fotos obligatorias y puede leer la planilla de campo con una foto o archivo.' },
            { titulo: '5. Informe', detalle: 'Se cargan los resultados del laboratorio, la IA interpreta, se genera el informe con la plantilla, se firma y se envía al cliente.' },
        ],
        reglas: [
            'La IA propone, las personas aprueban: nada sale al cliente sin revisión.',
            'Cada persona ve el menú de su área; los administradores ven todo.',
            'Si algo no está claro, pregúntale a Martha (el botón de chat con su foto, abajo a la derecha).',
        ],
        preguntas: [
            { pregunta: '¿Necesito instalar algo?', respuesta: 'No. Se abre en el navegador del computador o del celular en als.paradixe.xyz. En el celular puedes agregarla a la pantalla de inicio para usarla como aplicación.' },
            { pregunta: '¿Qué hago si olvidé la contraseña?', respuesta: 'En la pantalla de ingreso usa "¿Olvidaste tu contraseña?" y sigue el enlace que llega a tu correo.' },
        ],
        captura: 'panel.png',
        fuentes: ['client/src/pages/DashboardPage.tsx', 'client/src/components/dashboard'],
        palabras: ['xmart', 'plataforma', 'sistema', 'como funciona', 'empezar', 'inicio'],
    },
    {
        key: 'paradixe',
        href: null,
        titulo: '¿Quién es Paradixe?',
        grupo: 'Fundamentos',
        resumen: 'La empresa de tecnología que construyó ALS Xmart y lo mejora cada semana.',
        paraQue: 'Paradixe es una empresa colombiana que diseña software con inteligencia artificial para que los procesos de las empresas sean más rápidos y confiables. Construyó ALS Xmart junto con el equipo de ALS: cada mejora sale de las reuniones con ustedes, de las dudas frecuentes y de lo que se observa en el uso diario.',
        quienes: ['Todo el equipo de ALS'],
        pasos: [
            { titulo: 'Cómo pedir un cambio', detalle: 'Cuéntaselo a Martha en el chat o a tu coordinador. Las solicitudes se recogen en las reuniones de seguimiento y se priorizan con ALS.' },
            { titulo: 'Cómo reportar un error', detalle: 'Describe qué estabas haciendo, en qué OIT o cotización y, si puedes, toma un pantallazo. Martha también puede ayudarte a describirlo.' },
        ],
        reglas: [
            'Los datos de ALS son de ALS: se usan solo para operar la plataforma.',
            'Xmart Academy se actualiza cuando cambia el software; cada novedad se revisa antes de publicarse.',
        ],
        preguntas: [],
        captura: null,
        fuentes: [],
        palabras: ['paradixe', 'soporte', 'quien hizo', 'error', 'falla', 'cambio'],
    },
    {
        key: 'clientes',
        href: '/clients',
        titulo: 'Clientes',
        grupo: 'Comercial',
        resumen: 'El directorio de clientes con su NIT y datos de contacto.',
        paraQue: 'Tener cada cliente registrado una sola vez evita escribirlo distinto en cada cotización u OIT, y permite buscar todo lo que se le ha hecho por nombre o NIT.',
        quienes: ['Comercial', 'Administradores'],
        pasos: [
            { titulo: 'Crear un cliente', detalle: 'Botón "Nuevo cliente": nombre, NIT y datos de contacto. Guardar.' },
            { titulo: 'Editar o eliminar', detalle: 'Usa los íconos de lápiz o papelera en la fila del cliente.' },
        ],
        reglas: ['Escribe el NIT con dígito de verificación (ej. 900.123.456-7).'],
        preguntas: [],
        captura: 'clientes.png',
        fuentes: ['client/src/pages/ClientsPage.tsx', 'server/src/controllers/client.controller.ts'],
        palabras: ['cliente', 'nit', 'empresa'],
    },
    {
        key: 'servicios',
        href: '/services',
        titulo: 'Servicios',
        grupo: 'Comercial',
        resumen: 'El catálogo de servicios que presta ALS (agua, aire, suelo, biota…).',
        paraQue: 'Los servicios se usan al crear cotizaciones y ayudan a la IA a reconocer qué se está pidiendo en cada documento.',
        quienes: ['Comercial', 'Administradores'],
        pasos: [
            { titulo: 'Crear un servicio', detalle: 'Botón "Nuevo servicio": nombre (ej. Muestreo de agua subterránea) y categoría (Agua, Aire, Suelo, Biota…).' },
        ],
        reglas: ['Usa nombres claros y sin abreviaturas: así la IA los reconoce en los documentos.'],
        preguntas: [],
        captura: 'servicios.png',
        fuentes: ['client/src/pages/ServicesPage.tsx'],
        palabras: ['servicio', 'catalogo', 'categoria'],
    },
    {
        key: 'cotizaciones',
        href: '/quotations',
        titulo: 'Cotizaciones',
        grupo: 'Comercial',
        resumen: 'Cargas la cotización y la IA revisa artículo por artículo si cumple con la norma.',
        paraQue: 'Antes de que una cotización llegue al cliente o se convierta en OIT, la IA la compara con la norma que aplica: qué parámetros pide cada artículo, cuáles están cotizados, cuáles faltan y cuáles sobran. Así se evitan reprocesos y muestreos incompletos.',
        quienes: ['Comercial', 'Dirección Técnica', 'Consultoría'],
        pasos: [
            { titulo: 'Cargar la cotización', detalle: 'Botón "Nueva cotización": elige el cliente, opcionalmente el servicio, y sube el PDF (hasta 100 MB). El número provisional se reemplaza por el número SIACOT del documento al terminar el análisis.' },
            { titulo: 'Esperar el análisis', detalle: 'La IA tarda unos minutos. Puedes seguir trabajando; te llega una notificación al terminar.' },
            { titulo: 'Revisar el resultado', detalle: 'En el detalle ves la puntuación, el cumplimiento por artículo de la norma, las alertas y los faltantes. Los faltantes que se pueden completar aparecen con un campo para llenarlos.' },
            { titulo: 'Decidir cada hallazgo', detalle: 'El laboratorio deja su decisión y un comentario en cada hallazgo. Lo que es solo informativo queda en un cuadro resumen y no baja la puntuación.' },
            { titulo: 'Aprobar para OIT', detalle: 'Cuando la cotización está bien, se marca como aprobada. Las OIT que traen su número SIACOT se vinculan solas.' },
        ],
        reglas: [
            'Si la IA no sabe si dos nombres son el mismo parámetro (ej. "Nitrógeno Kjeldahl" y "Nitrógeno total"), crea una consulta de parámetros para el laboratorio en lugar de adivinar.',
            'Equivalencias ya confirmadas: coliformes termotolerantes = fecales; SAAM = tensoactivos.',
            'La IA no emite veredictos de cumplimiento que no estén en los datos.',
        ],
        preguntas: [
            { pregunta: '¿Por qué mi cotización sigue "en análisis"?', respuesta: 'Los PDF largos pueden tardar varios minutos porque la IA revisa cada artículo de la norma. Si pasan más de 15 minutos, recarga la página; si sigue igual, avísale a Martha con el número de la cotización.' },
            { pregunta: '¿Qué significa un faltante "informativo"?', respuesta: 'Es una sugerencia: algo que la norma menciona pero que no necesariamente debía cotizarse. No baja la puntuación; queda para que el laboratorio decida.' },
        ],
        captura: 'cotizaciones.png',
        fuentes: ['client/src/pages/QuotationsPage.tsx', 'client/src/pages/QuotationDetailPage.tsx', 'client/src/components/quotations', 'server/src/services/quotationCompliance.ts', 'server/src/services/quotationLink.ts'],
        palabras: ['cotizacion', 'siacot', 'cumplimiento', 'norma', 'faltante', 'puntuacion', 'hallazgo'],
    },
    {
        key: 'consultas-parametros',
        href: '/parameter-consultations',
        titulo: 'Consultas de parámetros',
        grupo: 'Comercial',
        resumen: 'Las dudas de equivalencias entre parámetros que la IA le hace al laboratorio.',
        paraQue: 'Cuando la norma nombra un parámetro distinto a como lo cotiza el laboratorio, la IA no adivina: pregunta. Cada respuesta enseña a la plataforma y la siguiente cotización ya no pregunta lo mismo.',
        quienes: ['Laboratorio (responde)', 'Administradores'],
        pasos: [
            { titulo: 'Ver las pendientes', detalle: 'La pestaña "Pendientes" muestra el parámetro de la norma, cómo se cotizó y en qué cotización apareció.' },
            { titulo: 'Responder', detalle: 'Contesta "¿Es el mismo parámetro?" con Sí o No y, si quieres, una nota (cómo lo nombra el laboratorio, el método…).' },
        ],
        reglas: ['Cada respuesta se aplica a las siguientes cotizaciones automáticamente.'],
        preguntas: [],
        captura: 'consultas.png',
        fuentes: ['client/src/pages/ParameterConsultationsPage.tsx', 'server/src/controllers/quotation.controller.ts'],
        palabras: ['consulta', 'parametro', 'equivalencia', 'mismo parametro'],
    },
    {
        key: 'listas-distribucion',
        href: '/distribution-lists',
        titulo: 'Listas de distribución',
        grupo: 'Comercial',
        resumen: 'Grupos de correos que reciben informes y avisos.',
        paraQue: 'En lugar de escribir los mismos correos cada vez, se guarda una lista (ej. facturación de un cliente) y se elige al enviar.',
        quienes: ['Comercial', 'Administradores'],
        pasos: [
            { titulo: 'Crear una lista', detalle: 'Botón "Nueva lista": nombre y los correos de los destinatarios.' },
        ],
        reglas: ['Revisa los correos antes de guardar: a esa lista llegan los informes.'],
        preguntas: [],
        captura: 'listas.png',
        fuentes: ['client/src/pages/DistributionListsPage.tsx'],
        palabras: ['lista', 'distribucion', 'destinatario', 'correo'],
    },
    {
        key: 'oits',
        href: '/oits',
        titulo: 'OITs (órdenes de trabajo)',
        grupo: 'Operación',
        resumen: 'Cargas la OIT y la IA extrae servicios, recursos y alertas; desde ahí se programa, se muestrea y se informa.',
        paraQue: 'La OIT es el centro de todo el trabajo: cada una tiene pestañas para la información, la agenda, el muestreo, el informe y la calidad. Así cualquier persona sabe en qué va una orden sin preguntar.',
        quienes: ['Operaciones', 'Laboratorio', 'Dirección Técnica', 'Comercial (consulta)'],
        pasos: [
            { titulo: 'Crear la OIT', detalle: 'Botón "Nueva OIT" y sube el PDF. La IA lee cliente, NIT, "Informe a nombre de", servicios, ubicación y recursos. Si trae el número SIACOT, queda vinculada con su cotización.' },
            { titulo: 'Revisar la información', detalle: 'En "Info" ves lo que leyó la IA, las alertas y la información faltante. Si algo quedó mal, usa "Reiniciar análisis".' },
            { titulo: 'Seguir las pestañas', detalle: 'Agenda → Muestreo → Informe → Calidad. Cada pestaña se explica en su propio módulo de Academy.' },
            { titulo: 'Buscar', detalle: 'En la lista puedes buscar por número, cliente, NIT o cotización, y ordenar.' },
        ],
        reglas: [
            'Los técnicos ven solo las OIT donde están asignados; jefes, coordinadores y planeadores ven todas.',
            'El informe sale a nombre de lo que diga la OIT en "Informe a nombre de"; si está vacío, a nombre del cliente.',
        ],
        preguntas: [
            { pregunta: 'No veo una OIT que me dijeron que existe', respuesta: 'Si eres técnico, solo ves las OIT donde estás asignado. Pídele a tu coordinador que te asigne en la pestaña Agenda.' },
        ],
        captura: 'oits.png',
        fuentes: ['client/src/pages/OITsPage.tsx', 'client/src/pages/OITDetailPage.tsx', 'server/src/controllers/oit.controller.ts'],
        palabras: ['oit', 'orden de trabajo', 'orden', 'reiniciar analisis', 'vincular'],
    },
    {
        key: 'agenda',
        href: '/oits',
        titulo: 'Agenda y asignación de personal',
        grupo: 'Operación',
        resumen: 'La IA propone fecha y personal libre para cada servicio y marca en rojo lo que falta.',
        paraQue: 'Programar a mano obliga a revisar quién está libre y si hay equipos. La propuesta lo hace por ti: asigna al personal de monitoreo con menos carga (jefes y coordinadores al final), revisa los equipos según la matriz del servicio y avisa con banderas rojas.',
        quienes: ['Operaciones', 'Planeación', 'Coordinadores'],
        pasos: [
            { titulo: 'Abrir la pestaña Agenda', detalle: 'En la OIT, pestaña "Agenda". Verás la "Propuesta de programación IA" con cada servicio.' },
            { titulo: 'Aceptar la propuesta', detalle: '"Aceptar propuesta" asigna el personal libre, deja la hora de inicio a las 8:00 y muestra las alertas (por ejemplo, un equipo que falta).' },
            { titulo: 'Varios días', detalle: 'Si el monitoreo dura varios días, en "Editar programación" agrega días sueltos o un rango (puedes saltar sábados y domingos).' },
            { titulo: 'Ajustar a mano', detalle: '"Configurar manualmente" permite cambiar fecha, hora y personal de cada servicio.' },
        ],
        reglas: [
            'Solo aparece el personal de monitoreo activo (se administra en "Personal de monitoreo").',
            'Una bandera roja no bloquea: es un aviso para resolver antes del día del muestreo.',
        ],
        preguntas: [
            { pregunta: '¿Por qué no aparece una persona para asignar?', respuesta: 'Solo aparece quien está en la tabla de personal de monitoreo y activo. Un administrador puede agregarla en Administración → Personal de monitoreo.' },
        ],
        captura: 'agenda.png',
        fuentes: ['client/src/components/oit/ServiceScheduleCard.tsx', 'server/src/services/planningAssign.ts', 'server/src/controllers/planning.controller.ts', 'client/src/lib/scheduleDays.ts'],
        palabras: ['agenda', 'programar', 'programacion', 'asignar', 'propuesta', 'bandera', 'varios dias', 'rango'],
    },
    {
        key: 'muestreo',
        href: '/oits',
        titulo: 'Muestreo en campo',
        grupo: 'Operación',
        resumen: 'El formulario del técnico en el celular: llegada, datos, planilla, 5 fotos y envío.',
        paraQue: 'El técnico registra todo en el sitio, aun sin señal: el formulario se guarda en el teléfono y se envía solo al recuperar conexión. Al terminar, la IA revisa lo registrado y avisa si algo no cuadra.',
        quienes: ['Técnicos de monitoreo', 'Coordinadores'],
        pasos: [
            { titulo: 'Elegir el servicio', detalle: 'En la OIT, pestaña "Muestreo", toca el servicio que vas a hacer.' },
            { titulo: '"Llegué al sitio"', detalle: 'Registra la hora y la ubicación de llegada. Si el monitoreo dura varios días, márcalo cada día.' },
            { titulo: 'Leer la planilla', detalle: 'En "Leer la planilla de campo" toma una foto o adjunta la planilla (foto, PDF de cualquier número de páginas, Word o Excel). Los campos se llenan solos (en azul) y lo que no se pudo leer aparece como duda y en el chat. Puedes ver o quitar cada archivo.' },
            { titulo: 'Completar los datos', detalle: 'Revisa lo leído y completa lo que falte. El tipo de captación se elige de una lista y, si la OIT lo dice, ya viene lleno.' },
            { titulo: '5 fotos obligatorias', detalle: 'Panorámica del punto, toma de la muestra, parámetros in situ con el equipo, preservación y muestras en la nevera. Sin estas fotos no se puede terminar.' },
            { titulo: 'Terminar', detalle: 'Toca "Terminar": se registra la salida, se suben las fotos y se envía. Si no hay señal, queda guardado y se envía después.' },
        ],
        reglas: [
            'Los datos leídos de la planilla se marcan en azul: revísalos siempre.',
            'Si cambias el responsable del muestreo, escribe el motivo.',
            'No borres los datos del navegador del celular con un muestreo sin enviar.',
        ],
        preguntas: [
            { pregunta: 'La planilla no se leyó completa', respuesta: 'Revisa las dudas que aparecen debajo: son los campos que no se encontraron. Llénalos a mano. Si la foto quedó borrosa, tómala de nuevo con buena luz y de frente.' },
            { pregunta: '¿Qué pasa si no tengo señal?', respuesta: 'Sigue trabajando: todo queda guardado en el teléfono. Al terminar sin señal, el muestreo se envía solo cuando vuelva la conexión.' },
        ],
        captura: 'muestreo.png',
        fuentes: ['client/src/components/sampling', 'server/src/services/sheetFill.ts', 'server/src/services/sheetReader.ts', 'server/src/services/sheetText.ts', 'server/src/controllers/sheet.controller.ts'],
        palabras: ['muestreo', 'planilla', 'foto', 'llegue al sitio', 'terminar', 'captacion', 'campo', 'sin señal', 'formulario'],
    },
    {
        key: 'calendario',
        href: '/calendar',
        titulo: 'Calendario',
        grupo: 'Operación',
        resumen: 'La agenda de muestreos por mes, semana o día.',
        paraQue: 'Ver de un vistazo qué muestreos hay programados y quién los hace. Los monitoreos de varios días aparecen en cada uno de sus días.',
        quienes: ['Operaciones', 'Técnicos', 'Comercial (consulta)'],
        pasos: [
            { titulo: 'Cambiar la vista', detalle: 'Usa Mes, Semana, Día o Agenda, y las flechas para moverte.' },
            { titulo: 'Abrir un muestreo', detalle: 'Toca un evento para ir a su OIT.' },
            { titulo: 'Filtrar', detalle: 'Busca por número de OIT o usa los filtros Agendados / En progreso.' },
        ],
        reglas: [],
        preguntas: [],
        captura: 'calendario.png',
        fuentes: ['client/src/pages/CalendarPage.tsx'],
        palabras: ['calendario', 'agenda del mes', 'semana', 'evento'],
    },
    {
        key: 'recursos',
        href: '/resources',
        titulo: 'Recursos y equipos',
        grupo: 'Operación',
        resumen: 'El inventario de equipos, con su estado y vencimiento de calibración.',
        paraQue: 'La programación revisa este inventario para avisar si faltan equipos; la IA también alerta las calibraciones vencidas o por vencer.',
        quienes: ['Operaciones', 'Infraestructura'],
        pasos: [
            { titulo: 'Agregar un recurso', detalle: 'Nombre, tipo, cantidad y estado (Disponible, En uso o Mantenimiento).' },
            { titulo: 'Mantener el estado al día', detalle: 'Si un equipo sale a calibración o mantenimiento, cambia su estado para que no se proponga en la agenda.' },
        ],
        reglas: ['Un equipo con calibración vencida no debe usarse en campo.'],
        preguntas: [],
        captura: 'recursos.png',
        fuentes: ['client/src/pages/ResourcesPage.tsx', 'server/src/controllers/resource.controller.ts'],
        palabras: ['recurso', 'equipo', 'calibracion', 'inventario', 'multiparametro'],
    },
    {
        key: 'informes',
        href: '/oits',
        titulo: 'Informes y comunicados técnicos',
        grupo: 'Informes y calidad',
        resumen: 'Con los resultados del laboratorio la IA interpreta y se genera el informe con la plantilla.',
        paraQue: 'En la pestaña "Informe" de la OIT se suben las planillas y los resultados de laboratorio de cada servicio. La IA interpreta los resultados contra la norma y se genera el informe o comunicado técnico listo para revisar, firmar y enviar.',
        quienes: ['Laboratorio', 'Dirección Técnica', 'Consultoría'],
        pasos: [
            { titulo: 'Subir resultados', detalle: 'En "Gestión de informes por servicio", agrega el PDF de resultados de laboratorio del servicio.' },
            { titulo: 'Revisar la interpretación', detalle: 'La IA muestra resultados y hallazgos. Revisa antes de generar.' },
            { titulo: 'Generar y corregir', detalle: 'Genera el informe con la plantilla; puedes pedir correcciones en lenguaje natural y ver el historial de versiones.' },
            { titulo: 'Firmar y enviar', detalle: 'Registra las firmas (en pantalla o con documento firmado) y envía a los destinatarios o a una lista de distribución.' },
        ],
        reglas: [
            'Si el PDF de resultados es muy largo, súbelo dividido por servicio.',
            'Revisa siempre el informe antes de enviarlo: la IA redacta, la persona responde por él.',
        ],
        preguntas: [
            { pregunta: 'El análisis de resultados se quedó a medias', respuesta: 'Vuelve a cargar el PDF de resultados del servicio en la pestaña Informe. Si es muy largo, divídelo por servicio.' },
        ],
        captura: 'informe.png',
        fuentes: ['client/src/components/oit/ReportGenerator.tsx', 'client/src/components/oit/SendReportButton.tsx', 'client/src/components/oit/SignaturesPanel.tsx', 'server/src/config/templateDataMapper.ts'],
        palabras: ['informe', 'resultados', 'laboratorio', 'comunicado', 'firma', 'enviar informe', 'plantilla de informe'],
    },
    {
        key: 'calidad',
        href: '/oits',
        titulo: 'Calidad y no conformidades',
        grupo: 'Informes y calidad',
        resumen: 'Registro y seguimiento de hallazgos hasta su cierre, con certificados por etapa.',
        paraQue: 'Cuando algo no cumple lo esperado se registra como no conformidad, con severidad y responsable, y se le hace seguimiento hasta cerrarla con su resolución.',
        quienes: ['Sistema Integrado de Gestión', 'Dirección Técnica', 'Coordinadores'],
        pasos: [
            { titulo: 'Registrar', detalle: 'En la pestaña "Calidad" de la OIT, "Registrar no conformidad": descripción, severidad y quién la detectó.' },
            { titulo: 'Cerrar', detalle: '"Cerrar no conformidad" pide describir cómo se resolvió.' },
            { titulo: 'Certificado', detalle: 'Genera un certificado PDF de la etapa completada cuando se requiera.' },
        ],
        reglas: ['Una no conformidad no se cierra sin describir la resolución.'],
        preguntas: [],
        captura: null,
        fuentes: ['client/src/components/oit/NonConformitiesPanel.tsx', 'client/src/components/oit/CertificateButton.tsx'],
        palabras: ['calidad', 'no conformidad', 'hallazgo', 'certificado', 'severidad'],
    },
    {
        key: 'plantillas',
        href: '/sampling-templates',
        titulo: 'Plantillas de muestreo',
        grupo: 'Base técnica',
        resumen: 'Los pasos del formulario de campo para cada tipo de servicio.',
        paraQue: 'Cada plantilla define qué se registra en campo (datos, listas, fotos, documentos) y con qué plantilla de informe se genera el documento final.',
        quienes: ['Dirección Técnica', 'Operaciones'],
        pasos: [
            { titulo: 'Crear una plantilla', detalle: 'Nombre, tipo de OIT, descripción y los pasos del flujo (cada paso con su tipo: texto, número, lista, foto, documento…).' },
            { titulo: 'Papelera', detalle: 'Una plantilla eliminada se puede recuperar durante 90 días.' },
        ],
        reglas: ['Los cambios en una plantilla aplican a los muestreos nuevos, no a los ya enviados.'],
        preguntas: [],
        captura: 'plantillas.png',
        fuentes: ['client/src/pages/SamplingTemplatesPage.tsx', 'client/src/pages/CreateTemplatePage.tsx', 'client/src/pages/EditTemplatePage.tsx'],
        palabras: ['plantilla', 'pasos', 'formulario de campo'],
    },
    {
        key: 'normas',
        href: '/standards',
        titulo: 'Normas y reglas',
        grupo: 'Base técnica',
        resumen: 'Las normas (resoluciones, decretos) contra las que la IA revisa cotizaciones e informes.',
        paraQue: 'La IA solo puede revisar cumplimiento contra las normas que estén aquí, con sus criterios y el documento de referencia.',
        quienes: ['Dirección Técnica', 'Consultoría', 'Sistema Integrado de Gestión'],
        pasos: [
            { titulo: 'Agregar una norma', detalle: 'Título, tipo de documento, descripción o criterios y, opcionalmente, el PDF de referencia.' },
        ],
        reglas: ['Mantén las normas vigentes: una norma derogada lleva a revisiones equivocadas.'],
        preguntas: [],
        captura: 'normas.png',
        fuentes: ['client/src/pages/StandardsPage.tsx', 'client/src/pages/CreateStandardPage.tsx'],
        palabras: ['norma', 'resolucion', 'decreto', 'limite'],
    },
    {
        key: 'analitica',
        href: '/analytics',
        titulo: 'Analítica',
        grupo: 'Seguimiento',
        resumen: 'Indicadores de OIT, cotizaciones e informes generados.',
        paraQue: 'Ver cómo va la operación: cuántas OIT hay por estado, tendencias e informes recientes.',
        quienes: ['Dirección Técnica', 'Consultoría', 'Administradores'],
        pasos: [{ titulo: 'Consultar', detalle: 'Abre Analítica y revisa las gráficas; para un análisis a la medida, pídeselo a Martha.' }],
        reglas: [],
        preguntas: [],
        captura: 'analitica.png',
        fuentes: ['client/src/pages/AnalyticsPage.tsx'],
        palabras: ['analitica', 'indicador', 'estadistica', 'grafica', 'tendencia'],
    },
    {
        key: 'martha',
        href: '/ai',
        titulo: 'Martha, la asistente IA',
        grupo: 'Seguimiento',
        resumen: 'Pregúntale lo que sea del sistema; responde con tablas, gráficas y fotos, y entrega PDF, PowerPoint o Excel.',
        paraQue: 'Martha conoce las OIT, cotizaciones, recursos, normas y este Academy. Responde en lenguaje natural, arma informes con gráficas, tablas y fotos del muestreo, y los entrega en PDF, PowerPoint o Excel con la marca de ALS. Responde en el idioma que elijas.',
        quienes: ['Todo el equipo de ALS'],
        pasos: [
            { titulo: 'Abrir el chat', detalle: 'El botón con la foto de Martha, abajo a la derecha, en cualquier pantalla, o "Asistente IA" en el menú. Si estás en una OIT, Martha ya sabe cuál es.' },
            { titulo: 'Preguntar', detalle: 'Ej.: "¿Qué OIT están pendientes de programar?", "Hazme una gráfica de cotizaciones por estado", "Arma un informe de la OIT 15031 con las fotos".' },
            { titulo: 'Descargar', detalle: 'Debajo de cada respuesta están los botones PDF, PowerPoint y Excel.' },
        ],
        reglas: [
            'Martha responde con los datos del sistema; si algo no está, lo dice.',
            'Verifica la información antes de usarla en documentos oficiales.',
        ],
        preguntas: [],
        captura: 'ana.png',
        fuentes: ['client/src/pages/AIAssistantPage.tsx', 'client/src/components/shared', 'server/src/services/assistantContext.ts', 'server/src/services/assistantExport.ts'],
        palabras: ['martha', 'ana', 'asistente', 'chat', 'pdf', 'powerpoint', 'excel', 'descargar'],
    },
    {
        key: 'notificaciones',
        href: '/notifications',
        titulo: 'Notificaciones',
        grupo: 'Seguimiento',
        resumen: 'Avisos de análisis terminados, asignaciones y tareas pendientes, también en el celular.',
        paraQue: 'Te enteras cuando termina un análisis, te asignan un muestreo o algo requiere tu decisión, sin estar revisando la plataforma.',
        quienes: ['Todo el equipo de ALS'],
        pasos: [
            { titulo: 'Activar en el celular', detalle: 'En Configuración → Notificaciones, activa las notificaciones push y acepta el permiso del navegador.' },
            { titulo: 'Marcar como leídas', detalle: 'En Notificaciones puedes marcar todas como leídas o eliminar una.' },
        ],
        reglas: [],
        preguntas: [],
        captura: 'notificaciones.png',
        fuentes: ['client/src/pages/NotificationsPage.tsx'],
        palabras: ['notificacion', 'aviso', 'push', 'alerta'],
    },
    {
        key: 'personal-monitoreo',
        href: '/monitoring-staff',
        titulo: 'Personal de monitoreo',
        grupo: 'Administración',
        resumen: 'La tabla del personal que se puede asignar a muestreos.',
        paraQue: 'Solo quien está en esta tabla, y activo, aparece al asignar personal y en la propuesta automática. Los cargos de jefe, coordinador, supervisor o planeador ven todas las OIT y se asignan al final.',
        quienes: ['Operaciones (administradores)', 'Gerencia'],
        pasos: [
            { titulo: 'Agregar', detalle: 'Nombre, cargo y correo. El correo debe ser el mismo de su cuenta en ALS Xmart.' },
            { titulo: 'Desactivar', detalle: 'Si alguien sale de vacaciones o se retira, desactívalo en lugar de borrarlo.' },
        ],
        reglas: ['El correo une a la persona con su cuenta: si no coincide, no podrá ver sus OIT.'],
        preguntas: [],
        captura: 'personal.png',
        fuentes: ['client/src/pages/MonitoringStaffPage.tsx', 'server/src/services/monitoringStaff.ts'],
        palabras: ['personal', 'tecnico', 'coordinador', 'monitoreo', 'cargo'],
    },
    {
        key: 'usuarios',
        href: '/users',
        titulo: 'Usuarios y perfiles',
        grupo: 'Administración',
        resumen: 'Cuentas, roles y el menú que ve cada área.',
        paraQue: 'Se crean las cuentas con su rol. Cada área (Comercial, Operaciones, Laboratorio…) ve en el menú solo lo que usa; los administradores ven todo.',
        quienes: ['Super administrador'],
        pasos: [
            { titulo: 'Crear un usuario', detalle: 'Nombre, correo, rol y contraseña temporal; al primer ingreso se le pide cambiarla.' },
            { titulo: 'Cambiar rol o contraseña', detalle: 'Desde la fila del usuario.' },
        ],
        reglas: ['Nunca compartas contraseñas por chat: cada persona cambia la suya al ingresar.'],
        preguntas: [],
        captura: null,
        fuentes: ['client/src/pages/UsersPage.tsx', 'client/src/lib/areaMenus.ts'],
        palabras: ['usuario', 'rol', 'perfil', 'contraseña', 'cuenta', 'acceso'],
    },
    {
        key: 'configuracion',
        href: '/settings',
        titulo: 'Configuración',
        grupo: 'Administración',
        resumen: 'Tu perfil, tu idioma, tu contraseña y las notificaciones.',
        paraQue: 'Cada persona ajusta sus datos, elige el idioma de la plataforma, cambia su contraseña y activa las notificaciones en el celular.',
        quienes: ['Todo el equipo de ALS'],
        pasos: [
            { titulo: 'Cambiar el idioma', detalle: 'Configuración → Idioma, o el globo arriba a la derecha: español, inglés, portugués o francés. Martha también te responde en ese idioma.' },
            { titulo: 'Cambiar contraseña', detalle: 'Configuración → Cambiar contraseña: la actual y la nueva dos veces.' },
        ],
        reglas: [],
        preguntas: [],
        captura: null,
        fuentes: ['client/src/pages/SettingsPage.tsx', 'client/src/i18n'],
        palabras: ['configuracion', 'perfil', 'mi cuenta', 'idioma', 'ingles', 'portugues', 'frances'],
    },
];

export const moduloAcademy = (key: string) => MODULOS_ACADEMY.find(m => m.key === key) || null;

const fold = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Modulo al que se refiere una pregunta (por palabras clave), o null. */
export function moduloDePregunta(pregunta: string): string | null {
    const q = fold(pregunta);
    let best: { key: string; score: number } | null = null;
    for (const m of MODULOS_ACADEMY) {
        const score = m.palabras.reduce((acc, p) => acc + (q.includes(fold(p)) ? p.length : 0), 0);
        if (score > 0 && (!best || score > best.score)) best = { key: m.key, score };
    }
    return best?.key || null;
}
