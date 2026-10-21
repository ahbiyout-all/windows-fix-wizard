const sharp = require('sharp');
const fs = require('fs');

const svgBuffer = fs.readFileSync('public/icon.svg');

// Add width and height to SVG if missing, so sharp renders it correctly
let svgString = svgBuffer.toString();
if (!svgString.includes('width=')) {
  svgString = svgString.replace('<svg ', '<svg width="512" height="512" ');
}

sharp(Buffer.from(svgString))
  .resize(192, 192)
  .png()
  .toFile('public/icon-192.png')
  .then(() => console.log('192x192 created'))
  .catch(err => console.error(err));

sharp(Buffer.from(svgString))
  .resize(512, 512)
  .png()
  .toFile('public/icon-512.png')
  .then(() => console.log('512x512 created'))
  .catch(err => console.error(err));
