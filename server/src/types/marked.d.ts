// marked v4.3.0 no publica un campo "types" en su "exports" de package.json, asi que
// bajo resolucion moderna de TypeScript sus declaraciones no se encuentran (TS7016),
// aunque en tiempo de ejecucion el paquete funciona bien via require/import (es CJS).
// @types/marked es solo un stub que reexporta esos mismos tipos rotos, asi que no
// sirve. Se declara aqui, a mano, solo lo que el proyecto realmente usa.
declare module 'marked' {
    export const marked: {
        parse(markdown: string): string;
    };
}
