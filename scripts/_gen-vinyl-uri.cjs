const fs = require('fs');
const path = require('path');

const grooves = [];
for (let r = 360; r >= 170; r -= 7) {
  const opacity = 0.14 + ((360 - r) / 190) * 0.16;
  grooves.push(
    `<circle cx="400" cy="400" r="${r}" fill="none" stroke="rgba(255,255,255,${opacity.toFixed(3)})" stroke-width="1.4"/>`,
  );
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><defs><radialGradient id="vs" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="rgba(255,255,255,0.30)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle cx="400" cy="400" r="398" fill="#2a2f3d"/><circle cx="400" cy="400" r="396" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.8"/>${grooves.join('')}<circle cx="400" cy="400" r="170" fill="#12141c"/><circle cx="400" cy="400" r="156" fill="#ff5470" opacity="1"/><circle cx="400" cy="400" r="58" fill="#12141c"/><circle cx="400" cy="400" r="9" fill="#05060a"/><text x="400" y="302" text-anchor="middle" fill="rgba(0,0,0,0.8)" font-family="sans-serif" font-size="22" font-weight="bold" letter-spacing="4">SONG</text><text x="400" y="332" text-anchor="middle" fill="rgba(0,0,0,0.8)" font-family="sans-serif" font-size="22" font-weight="bold" letter-spacing="4">WORLD</text><text x="400" y="515" text-anchor="middle" fill="rgba(0,0,0,0.7)" font-family="sans-serif" font-size="14" letter-spacing="6">CUP</text><ellipse cx="300" cy="300" rx="200" ry="140" fill="url(#vs)" transform="rotate(-45 400 400)"/></svg>`;

const uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const out = path.resolve(__dirname, '../_vinyl_uri.txt');
fs.writeFileSync(out, uri);
console.log('written', out);
