// Xmart Academy en ingles, portugues y frances (Hernan, 2026-10-24: "la plataforma en espanol,
// ingles, portugues y frances"). El catalogo (academy-catalogo.ts) es la fuente en espanol; aqui
// se reemplazan solo los textos. Si a un modulo le falta traduccion, se muestra en espanol.
import en from './academy-i18n/en.json';
import pt from './academy-i18n/pt.json';
import fr from './academy-i18n/fr.json';
import { ModuloAcademy } from './academy-catalogo';

interface Traduccion { t: string; r: string; p: string; q: string[]; s: string[][]; g: string[]; f: string[][] }
type Diccionario = Record<string, unknown> & { _grupos: Record<string, string> };
const DICTS: Record<string, Diccionario> = { en: en as Diccionario, pt: pt as Diccionario, fr: fr as Diccionario };

export const idiomaAcademy = (lang: unknown): string | null => {
    const l = String(lang || '').slice(0, 2).toLowerCase();
    return l in DICTS ? l : null;
};

export function nombreGrupo(grupo: string, lang: string | null): string {
    return (lang && DICTS[lang]._grupos[grupo]) || grupo;
}

export function traducirModulo(m: ModuloAcademy, lang: string | null): ModuloAcademy {
    const t = lang ? (DICTS[lang][m.key] as Traduccion | undefined) : undefined;
    // Solo si la traduccion tiene la misma forma (mismos pasos, reglas y preguntas) que el catalogo.
    if (!t || t.s.length !== m.pasos.length || t.g.length !== m.reglas.length || t.f.length !== m.preguntas.length) return m;
    return {
        ...m,
        titulo: t.t, resumen: t.r, paraQue: t.p, quienes: t.q,
        pasos: t.s.map(([titulo, detalle]) => ({ titulo, detalle })),
        reglas: t.g,
        preguntas: t.f.map(([pregunta, respuesta]) => ({ pregunta, respuesta })),
    };
}
