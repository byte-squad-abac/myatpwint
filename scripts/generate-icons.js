const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create SVG template
const createSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#641B2E" rx="${size * 0.15}"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2})">
    <!-- Book icon -->
    <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.4}" height="${size * 0.5}" fill="#FBDB93" rx="${size * 0.02}"/>
    <rect x="${size * 0.15}" y="${size * 0.15}" width="${size * 0.3}" height="${size * 0.4}" fill="#FFF" rx="${size * 0.01}"/>
    <!-- Book pages lines -->
    <line x1="${size * 0.2}" y1="${size * 0.25}" x2="${size * 0.4}" y2="${size * 0.25}" stroke="#641B2E" stroke-width="${size * 0.01}"/>
    <line x1="${size * 0.2}" y1="${size * 0.3}" x2="${size * 0.4}" y2="${size * 0.3}" stroke="#641B2E" stroke-width="${size * 0.01}"/>
    <line x1="${size * 0.2}" y1="${size * 0.35}" x2="${size * 0.4}" y2="${size * 0.35}" stroke="#641B2E" stroke-width="${size * 0.01}"/>
  </g>
  <!-- App name for larger icons -->
  ${size >= 144 ? `
  <text x="${size / 2}" y="${size * 0.85}" text-anchor="middle" fill="#FBDB93" font-family="Arial, sans-serif" font-size="${size * 0.08}" font-weight="bold">
    MyatPwint
  </text>` : ''}
</svg>`;

// Generate SVG icons
sizes.forEach(size => {
  const svgContent = createSVG(size);
  const filePath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filePath, svgContent.trim());
  console.log(`Generated: icon-${size}x${size}.svg`);
});

// Create shortcut icons (simpler design)
const createShortcutSVG = (name, icon) => `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" fill="#641B2E" rx="14"/>
  <g transform="translate(24, 24)">
    ${icon}
  </g>
</svg>`;

const shortcuts = {
  'continue': '<path d="M8 5v14l11-7z" fill="#FBDB93"/>',
  'browse': '<circle cx="24" cy="24" r="20" fill="none" stroke="#FBDB93" stroke-width="3"/><path d="M32 32l8 8" stroke="#FBDB93" stroke-width="3"/>',
  'library': '<rect x="4" y="6" width="40" height="30" fill="none" stroke="#FBDB93" stroke-width="3"/><rect x="8" y="10" width="8" height="22" fill="#FBDB93"/><rect x="20" y="10" width="8" height="22" fill="#FBDB93"/><rect x="32" y="10" width="8" height="22" fill="#FBDB93"/>'
};

Object.entries(shortcuts).forEach(([name, icon]) => {
  const svgContent = createShortcutSVG(name, icon);
  const filePath = path.join(iconsDir, `shortcut-${name}.svg`);
  fs.writeFileSync(filePath, svgContent.trim());
  console.log(`Generated: shortcut-${name}.svg`);
});

console.log('\n✅ All PWA icons generated successfully!');
console.log('📝 Note: These are SVG placeholders. For production, convert to PNG using an online tool or imagemagick:');
console.log('   Example: convert icon-192x192.svg icon-192x192.png');