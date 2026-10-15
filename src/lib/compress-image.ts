const DEFAULT_MAX_BYTES = 800 * 1024;
const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_QUALITY = 0.82;

/** Shrink screenshots so they pass typical 1 MB reverse-proxy limits. */
export async function compressImageForUpload(
  file: File,
  opts?: { maxBytes?: number; maxWidth?: number; quality?: number },
): Promise<File> {
  const maxBytes = opts?.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxWidth = opts?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const quality = opts?.quality ?? DEFAULT_QUALITY;

  if (file.size <= maxBytes) return file;
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toJpeg = (q: number) =>
    new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", q);
    });

  let q = quality;
  let blob = await toJpeg(q);
  while (blob && blob.size > maxBytes && q > 0.45) {
    q -= 0.08;
    blob = await toJpeg(q);
  }

  if (!blob || blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "screenshot";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}
