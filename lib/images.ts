import "server-only";
import sharp from "sharp";

export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Normalises an uploaded photo: honours EXIF orientation, fits within 2000px, re-encodes as JPEG.
 * Re-encoding also drops EXIF (including GPS location).
 */
export async function normalisePhoto(input: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(input, { failOn: "error" })
    .rotate()
    .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Small copy for sending to the model as image input. */
export async function forModel(input: Buffer): Promise<string> {
  const data = await sharp(input).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
  return data.toString("base64");
}
