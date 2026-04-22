import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Button, Input, Modal } from '@/components/ui';

const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
];

export function BarcodeScanner({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);
    setStarting(true);

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);

    (async () => {
      try {
        const video = videoRef.current;
        if (!video) return;
        const constraints: MediaStreamConstraints = {
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        };
        const controls = await reader.decodeFromConstraints(
          constraints,
          video,
          (result, err) => {
            if (cancelled) return;
            if (result) {
              const text = result.getText().trim();
              controls.stop();
              controlsRef.current = null;
              onDetected(text);
            }
            if (err && err.name !== 'NotFoundException') {
              // 認識失敗の1フレームごとのエラーは無視（NotFoundExceptionは毎フレーム出る）
            }
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStarting(false);
      } catch (e) {
        if (cancelled) return;
        const name = e instanceof Error ? e.name : '';
        if (name === 'NotAllowedError') {
          setError('カメラへのアクセスが拒否されました。ブラウザの設定を確認してください');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setError('利用可能なカメラが見つかりませんでした');
        } else {
          setError(e instanceof Error ? e.message : 'カメラの起動に失敗しました');
        }
        setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onDetected]);

  const submitManual = () => {
    const cleaned = manualInput.trim().replace(/[^0-9]/g, '');
    if (cleaned.length < 8) {
      setError('バーコード番号は8桁以上の数字で入力してください');
      return;
    }
    setManualInput('');
    onDetected(cleaned);
  };

  return (
    <Modal open={open} onClose={onClose} title="バーコードをスキャン">
      <div className="flex flex-col gap-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1/3 w-3/4 rounded-md border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          {starting && !error && (
            <div className="absolute inset-0 grid place-items-center text-xs text-white/80">
              カメラを起動中...
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          商品のJANコード（バーコード）を枠内に収めてください。暗い場合はスマホのライトを当てると認識しやすくなります。
        </p>

        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
          <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            読み取れない場合は数字で手入力
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="4901234567890"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1"
            />
            <Button variant="secondary" onClick={submitManual} disabled={!manualInput.trim()}>
              確定
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
