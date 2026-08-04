const fs = require('fs');
const path = require('path');

const grooves = [];
for (let r = 360; r >= 170; r -= 7) {
  const opacity = 0.02 + ((360 - r) / 190) * 0.04;
  grooves.push(
    `<circle cx="400" cy="400" r="${r}" fill="none" stroke="rgba(255,255,255,${opacity.toFixed(3)})" stroke-width="1"/>`,
  );
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><defs><radialGradient id="vs" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="rgba(255,255,255,0.09)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle cx="400" cy="400" r="398" fill="#08080a"/><circle cx="400" cy="400" r="396" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>${grooves.join('')}<circle cx="400" cy="400" r="162" fill="#0c0c0f"/><circle cx="400" cy="400" r="150" fill="#ff5470" opacity="0.82"/><circle cx="400" cy="400" r="58" fill="#08080a"/><circle cx="400" cy="400" r="9" fill="#000"/><text x="400" y="305" text-anchor="middle" fill="rgba(0,0,0,0.55)" font-family="sans-serif" font-size="22" font-weight="bold" letter-spacing="4">SONG</text><text x="400" y="335" text-anchor="middle" fill="rgba(0,0,0,0.55)" font-family="sans-serif" font-size="22" font-weight="bold" letter-spacing="4">WORLD</text><text x="400" y="510" text-anchor="middle" fill="rgba(0,0,0,0.45)" font-family="sans-serif" font-size="14" letter-spacing="6">CUP</text><ellipse cx="300" cy="300" rx="200" ry="140" fill="url(#vs)" transform="rotate(-45 400 400)"/></svg>`;

const uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const out = path.resolve(__dirname, '../_vinyl_uri.txt');
fs.writeFileSync(out, uri);
console.log('written', out);
