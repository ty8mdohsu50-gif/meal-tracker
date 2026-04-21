import { APP_CONFIG } from '@/constants';
import {
  AuthFailedError,
  NetworkError,
  ParseError,
  RateLimitedError,
  ServerError,
  TimeoutError,
} from '@/domain/errors';
import type { DishResult } from '@/types/domain';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    dishes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          estimated_grams: { type: 'integer' },
          confidence: { type: 'number' },
        },
        required: ['name', 'estimated_grams', 'confidence'],
      },
    },
  },
  required: ['dishes'],
} as const;

const SYSTEM_PROMPT = `あなたは日本の食事写真を分析する栄養管理アシスタントです。
提供された食事写真を分析し、写っている料理と推定量を特定してください。

以下の制約に従ってください：
- 料理名は日本語で、一般的な名称を使う（例：「鶏の唐揚げ」「味噌汁」）
- 推定量は g 単位、整数で返す
- 複数料理が写っている場合は、それぞれを配列要素として返す
- 写真に料理が写っていない場合、または判断困難な場合は空配列を返す
- 各料理の confidence は 0.0〜1.0 で、視認性・典型性に基づく
- 調味料（しょうゆ、マヨネーズ等）は主料理に含めて考える
- 盛り付けの状態から量を推定（標準的な1人前との比較）

出力は指定された JSON Schema に厳密に従ってください。`;

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string };
};

function classifyHttpError(status: number): Error {
  if (status === 401 || status === 403) return new AuthFailedError(`HTTP ${status}`);
  if (status === 429) return new RateLimitedError(`HTTP ${status}`);
  if (status >= 500) return new ServerError(`HTTP ${status}`);
  return new ParseError(`HTTP ${status}`);
}

export async function callGemini(
  apiKey: string,
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png',
): Promise<DishResult[]> {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: SYSTEM_PROMPT },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.GEMINI_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(`${APP_CONFIG.GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new TimeoutError('Gemini API タイムアウト');
    }
    throw new NetworkError(e instanceof Error ? e.message : 'ネットワークエラー');
  }
  clearTimeout(timeoutId);

  if (!resp.ok) {
    throw classifyHttpError(resp.status);
  }

  let data: GeminiResponse;
  try {
    data = (await resp.json()) as GeminiResponse;
  } catch {
    throw new ParseError('JSON パースに失敗しました');
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new ParseError('Gemini応答にテキストが含まれていません');
  }

  try {
    const parsed = JSON.parse(text) as { dishes?: DishResult[] };
    return parsed.dishes ?? [];
  } catch {
    throw new ParseError('構造化出力の JSON パースに失敗しました');
  }
}
