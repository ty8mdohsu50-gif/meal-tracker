const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.85;

export async function resizeImageToJpeg(
  file: File,
  maxDimension: number = DEFAULT_MAX_DIMENSION,
  quality: number = DEFAULT_QUALITY,
): Promise<File> {
  const bitmap = await loadBitmap(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > maxDimension ? maxDimension / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D コンテキストを取得できません');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) throw new Error('画像のエンコードに失敗しました');

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    return new File([blob], `${baseName || 'photo'}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    if (typeof (bitmap as ImageBitmap).close === 'function') {
      (bitmap as ImageBitmap).close();
    }
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall back to <img> */
    }
  }
  return await loadHtmlImage(file);
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像を読み込めませんでした'));
    };
    img.src = url;
  });
}
