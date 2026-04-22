export type OpenFoodFactsProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  kcal_per_100g: number;
  p_per_100g: number;
  f_per_100g: number;
  c_per_100g: number;
  image_url: string | null;
  source_url: string;
};

type RawNutriments = Record<string, number | string | undefined>;

const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = [
  'product_name',
  'product_name_ja',
  'brands',
  'nutriments',
  'image_small_url',
  'image_url',
].join(',');

function pickNumber(record: RawNutriments, keys: string[]): number {
  for (const key of keys) {
    const raw = record[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const num = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

function normalizeBarcode(input: string): string {
  return input.trim().replace(/[^0-9]/g, '');
}

export async function fetchProductByBarcode(
  barcode: string,
  signal?: AbortSignal,
): Promise<OpenFoodFactsProduct | null> {
  const cleaned = normalizeBarcode(barcode);
  if (cleaned.length < 8) {
    throw new Error('バーコードの桁数が不正です');
  }

  const url = `${ENDPOINT}/${encodeURIComponent(cleaned)}?fields=${encodeURIComponent(FIELDS)}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`商品データの取得に失敗しました (HTTP ${res.status})`);
  }

  const body = (await res.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      product_name_ja?: string;
      brands?: string;
      nutriments?: RawNutriments;
      image_small_url?: string;
      image_url?: string;
    };
  };

  if (!body.product || body.status === 0) return null;

  const name = body.product.product_name_ja?.trim() || body.product.product_name?.trim() || '';
  if (!name) return null;

  const n = body.product.nutriments ?? {};
  let kcal = pickNumber(n, ['energy-kcal_100g', 'energy-kcal_value']);
  if (kcal === 0) {
    const kj = pickNumber(n, ['energy-kj_100g', 'energy_100g']);
    if (kj > 0) kcal = Math.round(kj / 4.184);
  }

  return {
    barcode: cleaned,
    name,
    brand: body.product.brands?.split(',')[0]?.trim() || null,
    kcal_per_100g: Math.round(kcal),
    p_per_100g: Number(pickNumber(n, ['proteins_100g']).toFixed(1)),
    f_per_100g: Number(pickNumber(n, ['fat_100g']).toFixed(1)),
    c_per_100g: Number(pickNumber(n, ['carbohydrates_100g']).toFixed(1)),
    image_url: body.product.image_small_url || body.product.image_url || null,
    source_url: `https://world.openfoodfacts.org/product/${cleaned}`,
  };
}
