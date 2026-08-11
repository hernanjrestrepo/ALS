import fs from 'fs';
import path from 'path';

async function verify() {
    console.log("🧐 Verificando precisión de extracción de Kimi K2.6...");
    
    const resultPath = '/home/dylan/tmp/kimi_analysis_result.json';
    if (!fs.existsSync(resultPath)) {
        console.error("❌ No se encontró el resultado de Kimi.");
        return;
    }

    let raw = fs.readFileSync(resultPath, 'utf8');
    raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(raw).parsedData;
    
    const checkpoints = [
        { field: 'cliente', expected: /BIOGER/i },
        { field: 'contrato', expected: /13630/i },
        { field: 'estaciones', check: (v: any) => v.length >= 2 },
        { field: 'resultados', check: (v: any) => v.some((r: any) => r.parametro.includes('PM10')) }
    ];

    let passed = 0;
    for (const cp of checkpoints) {
        const val = data[cp.field];
        let ok = false;
        if (cp.expected instanceof RegExp) {
            ok = cp.expected.test(String(val));
        } else if (cp.check) {
            ok = cp.check(val);
        }

        if (ok) {
            console.log(`✅ [${cp.field}] Pasó la validación.`);
            passed++;
        } else {
            console.error(`❌ [${cp.field}] Falló. Valor:`, val);
        }
    }

    const score = (passed / checkpoints.length) * 100;
    console.log(`\n🏆 Precisión Técnica: ${score}%`);
}

verify();
