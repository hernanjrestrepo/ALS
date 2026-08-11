const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

async function genImages(imgDir) {
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

  const configs = [
    { name: 'foto_punto', w: 600, h: 400, color: 0x87CEEB, text: 'Fotografía\nPunto de Muestreo' },
    { name: 'foto_punto2', w: 600, h: 400, color: 0x98D8C8, text: 'Fotografía\nEquipo in Situ' },
    { name: 'mapa', w: 600, h: 400, color: 0x90EE90, text: 'Mapa de Ubicación\nGoogle Earth' },
    { name: 'grafica_barras', w: 600, h: 350, color: 0xFFFFFF, text: 'Gráfica de Resultados\n(ppm)' },
    { name: 'grafica_lineas', w: 600, h: 350, color: 0xFFFFFF, text: 'Tendencia Temporal\nÍndices' },
    { name: 'logo_als', w: 300, h: 120, color: 0xFFFFFF, text: 'ALS SERAMBIENTE' },
  ];

  for (const cfg of configs) {
    const image = new Jimp({ width: cfg.w, height: cfg.h, color: cfg.color });
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    image.print({ font, x: 0, y: 0, text: { text: cfg.text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, maxWidth: cfg.w, maxHeight: cfg.h });
    await image.write(path.join(imgDir, cfg.name + '.png'));
  }
  console.log('Images generated in', imgDir);
}

const imgDir = process.argv[2] || './tmp_images';
genImages(imgDir);
