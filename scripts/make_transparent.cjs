const fs = require('fs');
const zlib = require('zlib');

const input = process.argv[2];
const output = process.argv[3] || input.replace(/\.png$/i, '_clear.png');

// ---- CRC32 ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// ---- Decode ----
const buf = fs.readFileSync(input);
const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
if (!buf.subarray(0,8).equals(sig)) throw new Error('Not PNG');
let off = 8;
let width, height, colorType;
const idat = [];
while (off < buf.length) {
  const len = buf.readUInt32BE(off);
  const type = buf.toString('ascii', off+4, off+8);
  const data = buf.subarray(off+8, off+8+len);
  if (type === 'IHDR') { width=data.readUInt32BE(0); height=data.readUInt32BE(4); colorType=data[9]; }
  else if (type === 'IDAT') idat.push(data);
  else if (type === 'IEND') break;
  off += 12 + len;
}
if (colorType !== 2 && colorType !== 6) throw new Error('Only RGB/RGBA supported, got ' + colorType);
const inCh = colorType === 6 ? 4 : 3;
const raw = zlib.inflateSync(Buffer.concat(idat));
const stride = width * inCh;
const rgb = Buffer.alloc(height * stride);
let rp = 0, pp = 0;
for (let y = 0; y < height; y++) {
  const filter = raw[rp++];
  for (let x = 0; x < stride; x++) {
    const val = raw[rp++];
    const a = x >= inCh ? rgb[pp+x-inCh] : 0;
    const b = y > 0 ? rgb[pp-stride+x] : 0;
    const c = (x >= inCh && y > 0) ? rgb[pp-stride+x-inCh] : 0;
    let recon;
    switch (filter) {
      case 0: recon = val; break;
      case 1: recon = val + a; break;
      case 2: recon = val + b; break;
      case 3: recon = val + ((a+b)>>1); break;
      case 4: { const p=a+b-c, pa=Math.abs(p-a), pb=Math.abs(p-b), pc=Math.abs(p-c); recon = val + (pa<=pb&&pa<=pc?a:pb<=pc?b:c); break; }
      default: recon = val;
    }
    rgb[pp+x] = recon & 0xff;
  }
  pp += stride;
}

// ---- Key out checkerboard gray -> transparent ----
// Detected checkerboard gray ~ (216,217,214). Key pixels that are neutral & near that gray.
const REF = [216, 217, 214];
const THRESH = 42; // euclidean distance
const out = Buffer.alloc(height * width * 4);
let keyed = 0;
for (let i = 0; i < width * height; i++) {
  const r = rgb[i*inCh], g = rgb[i*inCh+1], b = rgb[i*inCh+2];
  const dr = r-REF[0], dg = g-REF[1], db = b-REF[2];
  const dist = Math.sqrt(dr*dr + dg*dg + db*db);
  // neutral check: not strongly colored (avoid tinting pink/gold edges)
  const maxc = Math.max(r,g,b), minc = Math.min(r,g,b);
  const neutral = (maxc - minc) < 30;
  const o = i*4;
  if (dist < THRESH && neutral) {
    out[o]=r; out[o+1]=g; out[o+2]=b; out[o+3]=0; keyed++;
  } else {
    out[o]=r; out[o+1]=g; out[o+2]=b; out[o+3]=255;
  }
}
console.log(`Keyed ${keyed} / ${width*height} pixels to transparent (${(keyed/(width*height)*100).toFixed(1)}%)`);

// ---- Encode RGBA ----
const outStride = width * 4;
const filtered = Buffer.alloc(height * (outStride + 1));
let fp = 0;
for (let y = 0; y < height; y++) {
  filtered[fp++] = 0; // filter None
  for (let x = 0; x < outStride; x++) filtered[fp++] = out[y*outStride + x];
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(filtered, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
fs.writeFileSync(output, png);
console.log('Wrote transparent PNG -> ' + output);
