const MAX_EDGE = 2000;
// Small JPEGs are sent byte for byte. Re-encoding changes the bytes, and the
// server matches saved photo readings (BB_READER_MODE=cache_first) by the
// hash of the exact upload, so a re-encoded demo photo would never match.
const PASS_THROUGH_BYTES = 1_500_000;

export async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return await readAsDataUrl(file);
  }
  if (file.type === "image/jpeg" && file.size <= PASS_THROUGH_BYTES) {
    return await readAsDataUrl(file);
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
