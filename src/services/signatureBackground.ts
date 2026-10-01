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

interface SignatureScan {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  data: Uint8ClampedArray;
  transparent: number;
  opaque: number;
  white: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function isBackdrop(data: Uint8ClampedArray, index: number): boolean {
  const alpha = data[index + 3];
  if (alpha < 16) return true;
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const lightness = (red + green + blue) / 3;
  const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
  return lightness > 230 && chroma < 28;
}

function isInk(data: Uint8ClampedArray, index: number): boolean {
  return data[index + 3] > 16 && !isBackdrop(data, index);
}

async function scanSignature(blob: Blob): Promise<SignatureScan | null> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = image;
    let transparent = 0;
    let opaque = 0;
    let white = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        if (data[index + 3] < 128) transparent += 1;
        else opaque += 1;
        if (isBackdrop(data, index) && data[index + 3] >= 16) white += 1;
        if (!isInk(data, index)) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    return { canvas, width, height, data, transparent, opaque, white, minX, minY, maxX, maxY };
  } finally {
    bitmap.close();
  }
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function cropToInk(scan: SignatureScan, knockoutWhite: boolean): Promise<Blob | null> {
  if (scan.maxX < 0) return null;
  const pad = 8;
  const minX = Math.max(0, scan.minX - pad);
  const minY = Math.max(0, scan.minY - pad);
  const maxX = Math.min(scan.width - 1, scan.maxX + pad);
  const maxY = Math.min(scan.height - 1, scan.maxY + pad);
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const alreadyTight = minX === 0 && minY === 0 && maxX === scan.width - 1 && maxY === scan.height - 1;
  if (alreadyTight && !knockoutWhite) return null;

  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(scan.canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  if (knockoutWhite) {
    const image = context.getImageData(0, 0, cropW, cropH);
    for (let index = 0; index < image.data.length; index += 4) {
      if (isBackdrop(image.data, index)) image.data[index + 3] = 0;
    }
    context.putImageData(image, 0, 0);
  }
  return canvasToPng(canvas);
}

export async function imageHasAlpha(blob: Blob): Promise<boolean> {
  const type = blob.type.toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/svg+xml') return false;
  if (type !== 'image/png' && type !== 'image/webp' && type !== 'image/gif') return false;
  const scan = await scanSignature(blob);
  if (!scan) return false;
  return scan.transparent / (scan.width * scan.height) > 0.02;
}

export async function prepareSignature(dataUrl: string): Promise<PreparedSignature> {
  const original = dataUrlToBlob(dataUrl);
  const type = original.type.toLowerCase();
  if (type === 'image/svg+xml') return { original, cleaned: original, skipped: true };

  const scan = await scanSignature(original);
  if (!scan) return { original, cleaned: original, skipped: true };

  const pixels = scan.width * scan.height;
  const alreadyClear = scan.transparent / pixels > 0.02;
  const whiteBackdrop = scan.opaque > 0 && scan.white / scan.opaque > 0.55;

  if (alreadyClear || whiteBackdrop) {
    const cleaned = await cropToInk(scan, whiteBackdrop);
    return { original, cleaned: cleaned || original, skipped: !cleaned };
  }

  try {
    const removed = await removeBackground(original, {
      output: { format: 'image/png' },
    });
    const removedScan = await scanSignature(removed);
    const cleaned = removedScan ? await cropToInk(removedScan, false) : null;
    return { original, cleaned: cleaned || removed, skipped: false };
  } catch {
    const cleaned = await cropToInk(scan, true);
    return { original, cleaned: cleaned || original, skipped: !cleaned };
  }
}
