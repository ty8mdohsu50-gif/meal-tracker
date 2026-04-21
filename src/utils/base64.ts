export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error('ファイル読み込み失敗'));
    reader.readAsDataURL(file);
  });
}

export function encodeApiKey(plain: string): string {
  try {
    return btoa(unescape(encodeURIComponent(plain)));
  } catch {
    return plain;
  }
}

export function decodeApiKey(enc: string): string {
  try {
    return decodeURIComponent(escape(atob(enc)));
  } catch {
    return enc;
  }
}
