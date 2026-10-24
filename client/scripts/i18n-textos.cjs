// Lista todos los textos de tr("...") del cliente y dice cuales faltan en cada diccionario.
// Uso: node client/scripts/i18n-textos.cjs            -> escribe src/i18n/textos.json y resume
//      node client/scripts/i18n-textos.cjs --faltan en -> imprime los que faltan en ingles (JSON)
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../src');
const files = [];
(function walk(d) {
    for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) { if (!/[\\/]i18n$/.test(p)) walk(p); }
        else if (/\.tsx?$/.test(f)) files.push(p);
    }
})(SRC);

const textos = new Set();
const re = /\btr\(\s*("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')\s*\)/g;
for (const f of files) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(re)) {
        const lit = m[1];
        const val = lit.startsWith('"') ? JSON.parse(lit) : JSON.parse('"' + lit.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"');
        textos.add(val);
    }
}
// Textos que llegan a tr() desde variables (p. ej. etiquetas que tambien se guardan en los datos).
for (const t of JSON.parse(fs.readFileSync(path.join(SRC, 'i18n/dinamicos.json'), 'utf8'))) textos.add(t);
const all = [...textos].sort((a, b) => a.localeCompare(b, 'es'));
const i = process.argv.indexOf('--faltan');
if (i > 0) {
    const lang = process.argv[i + 1];
    const dict = JSON.parse(fs.readFileSync(path.join(SRC, `i18n/${lang}.json`), 'utf8'));
    process.stdout.write(JSON.stringify(all.filter(t => !(t in dict)), null, 1));
} else {
    fs.writeFileSync(path.join(SRC, 'i18n/textos.json'), JSON.stringify(all, null, 1));
    for (const lang of ['en', 'pt', 'fr']) {
        const dict = JSON.parse(fs.readFileSync(path.join(SRC, `i18n/${lang}.json`), 'utf8'));
        console.log(`${lang}: ${all.filter(t => t in dict).length} de ${all.length} traducidos`);
    }
}
