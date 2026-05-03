// compress-photos.js — Run from project root: node compress-photos.js
// npm install sharp  (first time only)
const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const DIR    = path.join(__dirname, 'assets/photos');
const MAX_W  = 1600;
const MAX_H  = 1200;
const QUALITY = 80;

(async () => {
  const files = fs.readdirSync(DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  let before = 0, after = 0;

  for (const f of files) {
    const fp   = path.join(DIR, f);
    const stat = fs.statSync(fp);
    before += stat.size;

    const outPath = fp.replace(/\.(png|jpeg)$/i, '.jpg');
    const tmpPath = outPath + '.tmp';

    await sharp(fp)
      .resize(MAX_W, MAX_H, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toFile(tmpPath);

    const newStat = fs.statSync(tmpPath);
    after += newStat.size;
    fs.renameSync(tmpPath, outPath);
    // Remove original if it was a .png or .jpeg (different extension)
    if (fp !== outPath && fs.existsSync(fp)) fs.unlinkSync(fp);

    const pct = Math.round((1 - newStat.size / stat.size) * 100);

    process.stdout.write(`  ${f}: ${(stat.size/1024).toFixed(0)}KB → ${(newStat.size/1024).toFixed(0)}KB (-${pct}%)\n`);
  }

  console.log(`\nTotal: ${(before/1024/1024).toFixed(1)} MB → ${(after/1024/1024).toFixed(1)} MB`);
})();
