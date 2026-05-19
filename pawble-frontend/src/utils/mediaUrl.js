export function mediaUrl(relative) {
  if (!relative) return null;
  if (relative.startsWith('http://') || relative.startsWith('https://')) return relative;
  return relative.startsWith('/') ? relative : `/${relative}`;
}

export function placeholderImage(size = 400) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><rect fill='%23e5e7eb' width='${size}' height='${size}'/><text x='50%25' y='50%25' font-size='14' fill='%23999' text-anchor='middle' dy='.3em'>No image</text></svg>`;
  return `data:image/svg+xml,${svg}`;
}
