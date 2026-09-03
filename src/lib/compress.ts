"use client";

/**
 * Client-side image compression: resize to max 1280px and re-encode JPEG
 * until the blob is <= target bytes. Photos never leave the device at full size.
 */
const TARGET_BYTES = 300 * 1024;
const MAX_DIMENSION = 1280;

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("INVALID_TYPE");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNAVAILABLE");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);

  while (blob.size > TARGET_BYTES && quality > 0.35) {
    quality -= 0.12;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }
  return blob;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("ENCODE_FAILED"))),
      type,
      quality
    );
  });
}
