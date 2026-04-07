/**
 * Minimal QR Code URL generator using QR Server API (free, no signup).
 * Returns a URL to an SVG/PNG QR code image.
 */
export function getQRCodeUrl(data: string, size = 120): string {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=ffffff&color=1a1a2e&format=svg&qzone=1`;
}

/**
 * Generates a barcode-style tracking number display string.
 */
export function formatTrackingCode(id: string): string {
  return id.replace("-", " · ");
}
