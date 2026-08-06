const fs = require('fs');
const zlib = require('zlib');
const path = process.argv[2];
const buf = fs.readFileSync(path);
const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
let off=8, width,height,colorType; const idat=[];
while(off<buf.length){const len=buf.readUInt32BE(off);const type=buf.toString('ascii',off+4,off+8);const data=buf.subarray(off+8,off+8+len);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);colorType=data[9];}else if(type==='IDAT')idat.push(data);else if(type==='IEND')break;off+=12+len;}
const ch = colorType===6?4:3;
const raw=zlib.inflateSync(Buffer.concat(idat));
const stride=width*ch;
const px=Buffer.alloc(height*stride);
let rp=0,pp=0;
for(let y=0;y<height;y++){const f=raw[rp++];for(let x=0;x<stride;x++){const v=raw[rp++];const a=x>=ch?px[pp+x-ch]:0;const b=y>0?px[pp-stride+x]:0;const c=(x>=ch&&y>0)?px[pp-stride+x-ch]:0;let r;switch(f){case 0:r=v;break;case 1:r=v+a;break;case 2:r=v+b;break;case 3:r=v+((a+b)>>1);break;case 4:{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);r=v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);break;}default:r=v;}px[pp+x]=r&0xff;}pp+=stride;}
function at(x,y){const i=(y*width+x)*ch;return ch===4?[px[i],px[i+1],px[i+2],px[i+3]]:[px[i],px[i+1],px[i+2],255];}
let opaque=0,transparent=0;
for(let i=0;i<width*height;i++){if(px[i*ch+3]===0)transparent++;else opaque++;}
console.log(`Opaque:${opaque} Transparent:${transparent} (${(transparent/(width*height)*100).toFixed(1)}%)`);
console.log('Corner TL (5,5):', at(5,5));
console.log('Corner TR (1400,5):', at(1400,5));
console.log('Corner BL (5,690):', at(5,690));
// scan for a pink CUP pixel
let foundPink=null, foundWhite=null;
for(let y=0;y<height&&(!foundPink||!foundWhite);y+=2)for(let x=0;x<width;x+=2){const p=at(x,y);if(!foundPink&&p[0]>180&&p[1]<120&&p[2]>80&&p[3]===255){foundPink=[x,y,p];}if(!foundWhite&&p[0]>240&&p[1]>240&&p[2]>240&&p[3]===255){foundWhite=[x,y,p];}}
console.log('Pink CUP sample:', foundPink);
console.log('White text sample:', foundWhite);
