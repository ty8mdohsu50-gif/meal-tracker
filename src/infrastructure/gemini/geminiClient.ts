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

const SYSTEM_PROMPT = `あなたは日本の食事写真を分析する管理栄養士レベルの栄養管理アシスタントです。
提供された食事写真を分析し、写っている料理と推定量を特定してください。

【分析の進め方（内部処理、出力には含めない）】
1. 写真の皿・器・食材を一つずつ列挙
2. 調理法・色・食感・盛付から料理名を特定
3. 食器の種類やサイズ・盛付の高さから分量を g で推定

【料理名のつけ方】
- 具体的に：「ご飯（白米）」「鶏の唐揚げ」「グリーンサラダ」「わかめの味噌汁」「豚肉の生姜焼き」
- 抽象ワードは避ける（×「料理」「野菜」「肉」）
- 料理が明らかに複数の食材から成る場合は主素材を含める：「鮭の塩焼き」「ほうれん草のおひたし」「ツナサラダ」

【分量の目安（標準1人前）】
- ご飯：小盛 100g / 普通盛 150g / 大盛 200g（丼なら 250〜300g）
- パン：6枚切り食パン 1枚 60g、8枚切り 45g、クロワッサン 40g、ベーグル 90g
- 麺類（茹で後）：ラーメン 230g、うどん 250g、そば 240g、パスタ 220g
- 肉・魚の主菜：鶏もも 1切れ 80g、豚肉炒め 80g、魚の切身 80g、ハンバーグ 120g
- サラダ：小鉢 50g、副菜サラダ 70g、メインサラダ 150g
- 味噌汁・スープ：椀 1杯 180g
- 付け合わせ：ポテト 40g、ブロッコリー 30g
- 丼物（牛丼・カツ丼等）は 500〜650g を目安にご飯と具を別dish扱い

【confidence の基準】
- 0.9 以上：料理名・量ともに確信度高い（典型的で見やすい）
- 0.7〜0.9：料理は特定できるが量にばらつきあり
- 0.5〜0.7：料理か量のどちらかに不確実さ
- 0.3 未満：推測に自信なし

【その他】
- 調味料（しょうゆ・マヨネーズ・ドレッシング等）は主料理に含めて推定
- 添え物（漬物・刻み海苔・ネギなど5g未満）は省略
- 料理が写っていない／画像が不鮮明な場合は dishes を空配列
- 弁当・ワンプレート料理は、仕切りごとに別dishとして返す

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
