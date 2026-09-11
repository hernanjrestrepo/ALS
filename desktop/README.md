# ALS Xmart — Aplicación de Escritorio

Envoltorio nativo (Electron) que abre la plataforma web ya desplegada
(`https://als.paradixe.xyz`) como una aplicación de escritorio instalable,
con ícono propio, sin necesidad de abrir el navegador.

No duplica ningún código de la aplicación — usa siempre la versión en línea,
así que cualquier actualización del sitio web se refleja automáticamente
la próxima vez que se abra la app de escritorio.

## Generar el instalador

```bash
npm install
npm run dist:win     # Windows (.exe)
npm run dist:mac     # macOS (.dmg)
```

En Windows, si el build falla con un error de "symbolic link" al descargar
`winCodeSign`, es una limitación conocida de `electron-builder` en Windows
sin el "Modo desarrollador" activado. Se puede:

1. Activar el Modo desarrollador (Configuración → Actualización y seguridad
   → Para desarrolladores), o
2. Construir el instalador desde Linux/Mac (requiere `wine` + `wine32`
   instalados para compilar el target de Windows desde Linux).

El instalador queda en `release/ALS Xmart Setup <version>.exe`.

## Desarrollo local

```bash
npm install
npm start
```
