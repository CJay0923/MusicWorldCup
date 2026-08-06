const fs = require('fs');
const zlib = require('zlib');

const path = process.argv[2] || 'C:/Users/Cjay/Desktop/stefanie-song-worldcup-react/public/Professional_esports_music_tou_2026-08-05T14-32-03.png';
const buf = fs.readFileSync(path);

// PNG signature
const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!buf.subarray(0, 8).equals(sig)) { console.error('Not a PNG'); process.exit(1); }

let off = 8;
let width, height, bitDepth, colorType;
const idat = [];
while (off < buf.length) {
  const len = buf.readUInt32BE(off);
  const type = buf.toString('ascii', off + 4, off + 8);
  const data = buf.subarray(off + 8, off + 8 + len);
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    bitDepth = data[8];
    colorType = data[9];
    console.log(`IHDR: ${width}x${height} bitDepth=${bitDepth} colorType=${colorType}`);
  } else if (type === 'IDAT') {
    idat.push(data);
  } else if (type === 'IEND') break;
  off += 12 + len;
}

const raw = zlib.inflateSync(Buffer.concat(idat));
console.log(`Raw decompressed size: ${raw.length}`);

// colorType: 2=RGB, 6=RGBA
const channels = colorType === 6 ? 4 : 3;
const bpp = channels; // 8-bit
const stride = width * bpp;

// Unfilter
const pixels = Buffer.alloc(height * stride);
let rp = 0;
let pp = 0;
for (let y = 0; y < height; y++) {
  const filter = raw[rp++];
  for (let x = 0; x < stride; x++) {
    const val = raw[rp++];
    const a = x >= bpp ? pixels[pp + x - bpp] : 0;
    const b = y > 0 ? pixels[pp - stride + x] : 0;
    const c = (x >= bpp && y > 0) ? pixels[pp - stride + x - bpp] : 0;
    let recon;
    switch (filter) {
      case 0: recon = val; break;
      case 1: recon = val + a; break;
      case 2: recon = val + b; break;
      case 3: recon = val + ((a + b) >> 1); break;
      case 4: {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        recon = val + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
        break;
      }
      default: recon = val;
    }
    pixels[pp + x] = recon & 0xff;
  }
  pp += stride;
}

// Sample background colors: corners and a grid
const colorCount = {};
function key(r, g, b) { return `${r},${g},${b}`; }
// Sample top-left 40x40 region (likely background/checkerboard)
for (let y = 0; y < Math.min(40, height); y++) {
  for (let x = 0; x < Math.min(40, width); x++) {
    const i = (y * width + x) * bpp;
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const k = key(r, g, b);
    colorCount[k] = (colorCount[k] || 0) + 1;
  }
}
const top = Object.entries(colorCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log('Top background-region colors (r,g,b : count):');
top.forEach(([k, c]) => console.log(`  ${k} : ${c}`));
