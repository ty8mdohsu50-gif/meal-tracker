export class QuotaExceededError extends Error {
  readonly kind = 'QUOTA_EXCEEDED' as const;
}
export class AuthFailedError extends Error {
  readonly kind = 'AUTH_FAILED' as const;
}
export class RateLimitedError extends Error {
  readonly kind = 'RATE_LIMITED' as const;
}
export class ServerError extends Error {
  readonly kind = 'SERVER_ERROR' as const;
}
export class NetworkError extends Error {
  readonly kind = 'NETWORK_ERROR' as const;
}
export class ParseError extends Error {
  readonly kind = 'PARSE_ERROR' as const;
}
export class TimeoutError extends Error {
  readonly kind = 'TIMEOUT' as const;
}
export class NoRecognitionError extends Error {
  readonly kind = 'NO_RECOGNITION' as const;
}
export class ValidationError extends Error {
  readonly kind = 'VALIDATION' as const;
  constructor(
    readonly field: string,
    readonly reason: string,
  ) {
    super(`${field}: ${reason}`);
  }
}
export class StorageError extends Error {
  readonly kind = 'STORAGE' as const;
}

export type KnownError =
  | QuotaExceededError
  | AuthFailedError
  | RateLimitedError
  | ServerError
  | NetworkError
  | ParseError
  | TimeoutError
  | NoRecognitionError
  | ValidationError
  | StorageError;

export function errorMessageFor(e: unknown): string {
  if (e instanceof QuotaExceededError) return '本日のAPI使用上限に達しました。検索で記録してください。';
  if (e instanceof AuthFailedError) return 'APIキーが無効です。設定画面で再設定してください。';
  if (e instanceof RateLimitedError) return 'リクエスト集中により一時的に制限されています。';
  if (e instanceof ServerError) return 'Gemini側で一時的な障害が発生しています。';
  if (e instanceof NetworkError) return 'ネットワーク接続を確認してください。';
  if (e instanceof TimeoutError) return '応答がタイムアウトしました。再試行してください。';
  if (e instanceof ParseError) return '応答を解析できませんでした。';
  if (e instanceof NoRecognitionError) return '料理を認識できませんでした。検索で記録してください。';
  if (e instanceof ValidationError) return e.message;
  if (e instanceof StorageError) return 'データ保存に失敗しました。容量を確認してください。';
  if (e instanceof Error) return e.message;
  return '不明なエラーが発生しました。';
}
