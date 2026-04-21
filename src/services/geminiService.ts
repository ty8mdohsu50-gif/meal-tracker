import { APP_CONFIG } from '@/constants';
import { NoRecognitionError, QuotaExceededError, ValidationError } from '@/domain/errors';
import { apiUsageRepository } from '@/infrastructure/storage/apiUsageRepository';
import { callGemini } from '@/infrastructure/gemini/geminiClient';
import { retryWithBackoff } from '@/infrastructure/gemini/retryPolicy';
import type { DishResult } from '@/types/domain';
import { decodeApiKey } from '@/utils/base64';
import { fileToBase64 } from '@/utils/base64';

export async function estimateDishesFromFile(
  file: File,
  apiKeyEnc: string | null,
): Promise<DishResult[]> {
  if (!apiKeyEnc) {
    throw new ValidationError('APIキー', '設定画面で Gemini API キーを登録してください');
  }
  if (file.size > APP_CONFIG.IMAGE_MAX_SIZE_BYTES) {
    throw new ValidationError('写真', '画像サイズは5MB以下にしてください');
  }
  const mime = file.type;
  if (mime !== 'image/jpeg' && mime !== 'image/png') {
    throw new ValidationError('写真', 'JPEG または PNG を選択してください');
  }

  const count = apiUsageRepository.getTodayCount();
  if (count >= APP_CONFIG.GEMINI_DAILY_LIMIT) {
    throw new QuotaExceededError('本日のAPI使用上限です');
  }

  const base64 = await fileToBase64(file);
  const apiKey = decodeApiKey(apiKeyEnc);

  const dishes = await retryWithBackoff(
    () => callGemini(apiKey, base64, mime as 'image/jpeg' | 'image/png'),
    {
      maxRetries: APP_CONFIG.GEMINI_MAX_RETRIES,
      baseDelayMs: APP_CONFIG.GEMINI_BASE_RETRY_DELAY_MS,
      retryableKinds: ['RATE_LIMITED', 'SERVER_ERROR', 'TIMEOUT', 'NETWORK_ERROR'],
    },
  );

  apiUsageRepository.incrementToday();

  if (!dishes.length) {
    throw new NoRecognitionError('写真から料理を認識できませんでした');
  }
  return dishes;
}
