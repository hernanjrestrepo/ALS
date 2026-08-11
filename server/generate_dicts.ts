import fs from 'fs';
import path from 'path';

// This script analyzes mapping context and creates a dictionary for the AI
async function generate() {
    const airContext = JSON.parse(fs.readFileSync('/home/dylan/tmp/air_mapping_context.json', 'utf8'));
    
    const dict: Record<string, string> = {};
    for (const item of airContext) {
        if (!dict[item.id]) {
            dict[item.id] = item.context.replace(/\{var_\d+\}/, '___');
        }
    }

    console.log("📖 Variable Dictionary for Air Quality:");
    Object.keys(dict).sort((a,b) => parseInt(a) - parseInt(b)).forEach(id => {
        console.log(`var_${id}: Contexto: ${dict[id]}`);
    });

    fs.writeFileSync('/home/dylan/tmp/air_variable_dictionary.json', JSON.stringify(dict, null, 2));
}

generate();
