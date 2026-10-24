// Envuelve los textos visibles de la interfaz con tr('...') para traducirlos (es, en, pt, fr).
// Idempotente: lo que ya esta en tr() no se vuelve a tocar. Tambien escribe la lista de textos
// (src/i18n/textos.json) para completar los diccionarios.
//
// Que envuelve: texto JSX, atributos visibles (placeholder, title, aria-label, alt, label,
// description), textos sueltos o ternarios dentro de JSX, el primer argumento de toast.*() y
// confirm(), y cambia toLocale*('es-CO') por toLocale*(locale()).
// Uso: node client/scripts/i18n-envolver.cjs [--dry]
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../src');
const DRY = process.argv.includes('--dry');
const SKIP = [/components[\\/]ui[\\/]/, /[\\/]i18n[\\/]/];
const ATTRS = /^(placeholder|title|aria-label|alt|label|description)$/;
const has = s => /[A-Za-zÁÉÍÓÚÜáéíóúüñÑ¿¡]{2}/.test(s) && !/^[a-z0-9_.-]+$/.test(s.trim()); // descarta claves/ids
const ENT = { '&nbsp;': ' ', '&quot;': '"', '&amp;': '&', '&apos;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>', '&middot;': '·', '&rarr;': '→' };
const decode = s => s.replace(/&[a-z#0-9]+;/gi, e => ENT[e] ?? e);
const q = s => JSON.stringify(s);

const files = [];
(function walk(d) {
    for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (/\.tsx$/.test(f) && !SKIP.some(r => r.test(p))) files.push(p);
    }
})(SRC);

const textos = new Set();
let total = 0;

const isTrCall = n => n && ts.isCallExpression(n) && n.expression.getText() === 'tr';

for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const edits = []; // { start, end, text }
    let usaTr = false, usaLocale = false;

    // Literal que es "contenido" dentro de una expresion JSX hija: {'x'}, {c ? 'a' : 'b'}, {c && 'x'}
    const esContenidoJsx = node => {
        let cur = node;
        while (cur.parent && (ts.isConditionalExpression(cur.parent) || ts.isParenthesizedExpression(cur.parent)
            || (ts.isBinaryExpression(cur.parent) && /^(&&|\|\||\?\?)$/.test(cur.parent.operatorToken.getText())))) {
            if (ts.isConditionalExpression(cur.parent) && cur.parent.condition === cur) return false;
            if (ts.isBinaryExpression(cur.parent) && cur.parent.left === cur && cur.parent.operatorToken.getText() === '&&') return false;
            cur = cur.parent;
        }
        return !!cur.parent && ts.isJsxExpression(cur.parent) && !!cur.parent.parent && (ts.isJsxElement(cur.parent.parent) || ts.isJsxFragment(cur.parent.parent));
    };

    (function visit(node) {
        if (isTrCall(node)) return; // ya traducido
        if (ts.isJsxText(node)) {
            const raw = node.getText();
            const norm = decode(raw).replace(/\s+/g, ' ').trim();
            if (has(norm)) {
                const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
                // Espacio pegado a otro elemento en la misma linea: se conserva como {' '}
                const l = lead && !lead.includes('\n') ? "{' '}" : lead;
                const t = trail && !trail.includes('\n') ? "{' '}" : trail;
                edits.push({ start: node.getStart(), end: node.getEnd(), text: `${l}{tr(${q(norm)})}${t}` });
                textos.add(norm); usaTr = true;
            }
        } else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) && ATTRS.test(node.name.getText()) && has(node.initializer.text)) {
            edits.push({ start: node.initializer.getStart(), end: node.initializer.getEnd(), text: `{tr(${q(node.initializer.text)})}` });
            textos.add(node.initializer.text); usaTr = true;
        } else if (ts.isStringLiteral(node) && has(node.text) && esContenidoJsx(node)) {
            edits.push({ start: node.getStart(), end: node.getEnd(), text: `tr(${q(node.text)})` });
            textos.add(node.text); usaTr = true;
        } else if (ts.isCallExpression(node)) {
            const callee = node.expression.getText();
            const a0 = node.arguments[0];
            if (/^(toast(\.(success|error|warning|info|message))?|window\.confirm|confirm|alert|window\.alert)$/.test(callee) && a0 && ts.isStringLiteral(a0) && has(a0.text)) {
                edits.push({ start: a0.getStart(), end: a0.getEnd(), text: `tr(${q(a0.text)})` });
                textos.add(a0.text); usaTr = true;
            }
            if (/\.toLocale(Date|Time)?String$/.test(callee) && a0 && ts.isStringLiteral(a0) && a0.text === 'es-CO') {
                edits.push({ start: a0.getStart(), end: a0.getEnd(), text: 'locale()' });
                usaLocale = true;
            }
            // Mensaje por defecto de errores del servidor: error?.response?.data?.error || 'texto'
        } else if (ts.isStringLiteral(node) && has(node.text) && /\s|[áéíóúñ]/i.test(node.text) || (ts.isStringLiteral(node) && /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+$/.test(node.text))) {
            // return 'Texto' dentro de funciones que arman etiquetas (getStatusLabel, ...) y
            // valores de messages={{ ... }} (calendario)
            const fn = (() => { let c = node.parent; while (c && !ts.isFunctionLike(c)) c = c.parent; return c; })();
            const fnName = fn && (fn.name ? fn.name.getText() : (fn.parent && ts.isVariableDeclaration(fn.parent) ? fn.parent.name.getText() : ''));
            const enReturn = ts.isReturnStatement(node.parent) || (ts.isConditionalExpression(node.parent) && ts.isReturnStatement(node.parent.parent));
            const enMessages = ts.isPropertyAssignment(node.parent) && (() => { let c = node.parent; while (c && !ts.isJsxAttribute(c)) c = c.parent; return c && c.name.getText() === 'messages'; })();
            if ((enReturn && /label|text|title|nombre|mensaje|message/i.test(fnName || '')) || enMessages) {
                edits.push({ start: node.getStart(), end: node.getEnd(), text: `tr(${q(node.text)})` });
                textos.add(node.text); usaTr = true;
            }
        } else if (ts.isBinaryExpression(node) && node.operatorToken.getText() === '||' && ts.isStringLiteral(node.right) && has(node.right.text)
            && /response\??\.data\??\.(error|message)/.test(node.left.getText())) {
            edits.push({ start: node.right.getStart(), end: node.right.getEnd(), text: `tr(${q(node.right.text)})` });
            textos.add(node.right.text); usaTr = true;
        }
        ts.forEachChild(node, visit);
    })(sf);

    if (!edits.length) continue;
    total += edits.length;
    let out = src;
    for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    const yaImporta = /from '@\/i18n'/.test(out);
    if (!yaImporta) {
        const names = [usaTr && 'tr', usaLocale && 'locale'].filter(Boolean).join(', ');
        const imports = [...out.matchAll(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm)];
        const at = imports.length ? imports[imports.length - 1].index + imports[imports.length - 1][0].length : 0;
        out = out.slice(0, at) + `\nimport { ${names} } from '@/i18n';` + out.slice(at);
    } else {
        // completa el import existente
        out = out.replace(/import \{([^}]*)\} from '@\/i18n';/, (m, g) => {
            const set = new Set(g.split(',').map(s => s.trim()).filter(Boolean));
            if (usaTr) set.add('tr'); if (usaLocale) set.add('locale');
            return `import { ${[...set].join(', ')} } from '@/i18n';`;
        });
    }
    if (!DRY) fs.writeFileSync(file, out);
    console.log(`${path.relative(SRC, file)}: ${edits.length}`);
}

// Lista de textos (union con lo ya registrado)
const listPath = path.join(SRC, 'i18n/textos.json');
const prev = fs.existsSync(listPath) ? JSON.parse(fs.readFileSync(listPath, 'utf8')) : [];
const all = [...new Set([...prev, ...textos])].sort((a, b) => a.localeCompare(b, 'es'));
if (!DRY) { fs.mkdirSync(path.dirname(listPath), { recursive: true }); fs.writeFileSync(listPath, JSON.stringify(all, null, 1)); }
console.log(`\n${total} cambios; ${all.length} textos`);
