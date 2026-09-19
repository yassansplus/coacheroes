// Extract only artwork from the supplied mockups. Text and controls remain native UI.
// Run from mobile/: node scripts/prepare-onboarding-assets.cjs
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'FitBuddy_Onboarding_01-16');
const destination = path.join(root, 'assets/onboarding');
const crops = [
  ['welcome', '01_', 28, 570, 798, 617, 28],
  ['recomposition', '02_', 127, 1080, 182, 158, 16],
  ['performance', '02_', 558, 1060, 150, 173, 12],
  ['profile', '03_', 192, 345, 479, 313, 22],
  ['level', '04_', 238, 449, 374, 283, 22],
  ['kettlebell', '04_', 84, 1190, 80, 92, 10],
  ['performances', '05_', 561, 203, 262, 281, 18],
  ['gym', '06_', 108, 1251, 119, 104, 10],
  ['house', '06_', 369, 1251, 119, 104, 10],
  ['club', '06_', 619, 1251, 137, 104, 10],
  ['availability', '07_', 181, 160, 462, 288, 20],
  ['full-gym', '08_', 58, 544, 216, 170, 0],
  ['building-gym', '08_', 342, 544, 200, 170, 0],
  ['home-gym', '08_', 607, 544, 194, 170, 0],
  ['barbell', '08_', 352, 1040, 149, 77, 10],
  ['machine', '08_', 649, 1028, 99, 95, 10],
  ['pulley', '08_', 120, 1202, 67, 98, 8],
  ['punching-bag', '08_', 394, 1202, 64, 99, 8],
  ['bodyweight', '08_', 638, 1220, 121, 80, 8],
  ['walking', '10_', 86, 779, 80, 114, 8],
  ['salad', '11_', 602, 241, 205, 198, 14],
  ['chicken', '12_', 65, 817, 64, 65, 6],
  ['rice', '12_', 334, 818, 64, 65, 6],
  ['eggs', '12_', 584, 817, 65, 65, 6],
  ['salmon', '12_', 62, 938, 70, 58, 6],
  ['pasta', '12_', 337, 934, 63, 65, 6],
  ['yogurt', '12_', 594, 934, 61, 65, 6],
  ['pork', '12_', 65, 1170, 65, 60, 6],
  ['alcohol', '12_', 314, 1158, 47, 73, 6],
  ['milk', '12_', 578, 1159, 38, 72, 5],
  ['wheat', '12_', 67, 1282, 63, 73, 6],
  ['peanuts', '12_', 319, 1286, 69, 71, 6],
  ['none', '12_', 604, 1289, 62, 64, 6],
  ['target', '14_', 73, 519, 104, 105, 10],
  ['person', '14_', 82, 704, 80, 96, 8],
];

fs.mkdirSync(destination, { recursive: true });
for (const [name, prefix, x, y, width, height, feather] of crops) {
  const filename = fs.readdirSync(source).find((entry) => entry.startsWith(prefix));
  const input = PNG.sync.read(fs.readFileSync(path.join(source, filename)));
  const output = new PNG({ width, height });
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const from = ((y + row) * input.width + x + column) * 4;
      const to = (row * width + column) * 4;
      input.data.copy(output.data, to, from, from + 4);
      if (feather) {
        const edge = Math.min(row, column, height - 1 - row, width - 1 - column);
        output.data[to + 3] = Math.round(255 * Math.min(1, edge / feather));
      }
    }
  }
  fs.writeFileSync(path.join(destination, `${name}.png`), PNG.sync.write(output));
}
console.log(`Prepared ${crops.length} onboarding illustrations.`);
