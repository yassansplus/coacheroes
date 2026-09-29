// Keep the approved originals; generate smaller transparent PNGs for the app.
const fs = require('node:fs/promises');
const path = require('node:path');
const Jimp = require('jimp-compact');

async function main() {
  const source = path.join(__dirname, '../assets/badges/niveaux');
  const destination = path.join(source, 'runtime');
  await fs.mkdir(destination, { recursive: true });
  const files = (await fs.readdir(source)).filter(file => /^\d{2}-.+\.png$/.test(file)).sort();
  if (files.length !== 10) throw new Error('Expected the ten approved badge PNGs.');
  for (const file of files) {
    const image = await Jimp.read(path.join(source, file));
    await image.resize(768, 768, Jimp.RESIZE_BICUBIC).deflateLevel(9).writeAsync(path.join(destination, file));
    console.log(`Prepared ${file} (768 × 768, RGBA)`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
