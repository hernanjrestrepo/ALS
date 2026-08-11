const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PDF_DIR = path.join(__dirname, '../templates/docxtemplater/pdf_samples');
const OUT_DIR = path.join(__dirname, '../uploads/preview_images');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const pdfs = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));

for (const pdf of pdfs) {
  const base = pdf.replace('.pdf', '');
  const imgDir = path.join(OUT_DIR, base);
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

  try {
    console.log('[IMG]', pdf, '...');
    execSync(
      `pdftoppm -png -r 150 -cropbox "${path.join(PDF_DIR, pdf)}" "${path.join(imgDir, 'page')}"`,
      { stdio: 'ignore', timeout: 60000 }
    );

    const files = fs.readdirSync(imgDir).sort();
    let counter = 1;
    for (const f of files) {
      if (f.startsWith('page-')) {
        const newName = `page-${counter}.png`;
        if (f !== newName) {
          fs.renameSync(path.join(imgDir, f), path.join(imgDir, newName));
        }
        counter++;
      }
    }
    console.log('[OK]', base, '-', counter - 1, 'pages');
  } catch (err) {
    console.error('[ERR]', pdf, err.message);
  }
}

console.log('Done! Images in', OUT_DIR);
