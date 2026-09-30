import { removeBackground } from '@imgly/background-removal';

export interface PreparedSignature {
  original: Blob;
  cleaned: Blob;
  skipped: boolean;
}

function dataUrlMime(dataUrl: string): string {
  return (/data:([^;,]+)/.exec(dataUrl)?.[1] || 'application/octet-stream').toLowerCase();
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [, body = ''] = dataUrl.split(',');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: dataUrlMime(dataUrl) });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function imageHasAlpha(blob: Blob): Promise<boolean> {
  const type = blob.type.toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/svg+xml') return false;
  if (type !== 'image/png' && type !== 'image/webp' && type !== 'image/gif') return false;

  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return false;
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 255) return true;
    }
    return false;
  } finally {
    bitmap.close();
  }
}

export async function prepareSignature(dataUrl: string): Promise<PreparedSignature> {
  const original = dataUrlToBlob(dataUrl);
  const type = original.type.toLowerCase();
  if (type === 'image/svg+xml' || (await imageHasAlpha(original))) {
    return { original, cleaned: original, skipped: true };
  }
  const cleaned = await removeBackground(original, {
    output: { format: 'image/png' },
  });
  return { original, cleaned, skipped: false };
}
