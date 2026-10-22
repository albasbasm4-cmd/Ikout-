/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Keyboard,
  ArrowRight,
  Wifi,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Shield,
  Loader2,
} from 'lucide-react';
import { parseRoomPayload } from '../network/localIp';
import { LocalClientSocket, ClientSocketStatus } from '../network/LocalClientSocket';

/**
 * Pluggable Barcode / QR Scanner interface so native hardware scanners can be plugged in later
 */
export interface IBarcodeScanner {
  isAvailable(): Promise<boolean>;
  startScan(videoElement?: HTMLVideoElement | null): Promise<string>;
  stopScan(): Promise<void>;
}

/**
 * Standard Web Barcode / Camera scanner using BarcodeDetector API if available,
 * or simulated camera scanner fallback.
 */
export class WebBarcodeScanner implements IBarcodeScanner {
  private stream: MediaStream | null = null;
  private scanning = false;

  public async isAvailable(): Promise<boolean> {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      !!navigator.mediaDevices.getUserMedia
    );
  }

  public async startScan(videoElement?: HTMLVideoElement | null): Promise<string> {
    this.scanning = true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('الكاميرا غير مدعومة على هذا المتصفح');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });

    if (videoElement) {
      videoElement.srcObject = this.stream;
      await videoElement.play();
    }

    // Check for native BarcodeDetector API in modern Chromium / Android
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    if (BarcodeDetectorClass && videoElement) {
      const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });

      return new Promise<string>((resolve, reject) => {
        const interval = setInterval(async () => {
          if (!this.scanning) {
            clearInterval(interval);
            reject(new Error('تم إيقاف المسح'));
            return;
          }
          try {
            const barcodes = await detector.detect(videoElement);
            if (barcodes && barcodes.length > 0) {
              clearInterval(interval);
              this.stopScan();
              resolve(barcodes[0].rawValue);
            }
          } catch {
            // Frame detection error, keep trying
          }
        }, 250);
      });
    }

    // Fallback if BarcodeDetector API is not present:
    // Prompt user for scanned payload
    return new Promise<string>((resolve) => {
      const manualInput = window.prompt(
        'تعذر تشغيل قارئ الباركود التلقائي. يرجى إدخال رابط أو رمز الغرفة:'
      );
      this.stopScan();
      resolve(manualInput || 'ws://192.168.1.105:8080');
    });
  }

  public async stopScan(): Promise<void> {
    this.scanning = false;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}

export interface JoinScreenProps {
  onConnected?: (socket: LocalClientSocket, payload: any) => void;
  onBack: () => void;
  scannerOverride?: IBarcodeScanner;
  className?: string;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({
  onConnected,
  onBack,
  scannerOverride,
  className = '',
}) => {
  const [mode, setMode] = useState<'SCAN' | 'MANUAL'>('SCAN');
  const [playerName, setPlayerName] = useState<string>('لاعب');
  const [hostIp, setHostIp] = useState<string>('192.168.1.105');
  const [roomCode, setRoomCode] = useState<string>('');
  const [status, setStatus] = useState<
    'IDLE' | 'SCANNING' | 'CONNECTING' | 'ERROR' | 'SUCCESS'
  >('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<IBarcodeScanner>(
    scannerOverride || new WebBarcodeScanner()
  );
  const socketRef = useRef<LocalClientSocket | null>(null);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      scannerRef.current.stopScan();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleStartScan = async () => {
    setStatus('SCANNING');
    setErrorMessage(null);

    try {
      const rawPayload = await scannerRef.current.startScan(videoRef.current);
      handlePayloadScanned(rawPayload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('ERROR');
      setErrorMessage(`تعذر مسح رمز QR: ${msg}. يمكنك إدخال البيانات يدوياً.`);
    }
  };

  const handlePayloadScanned = (payload: string) => {
    const { ip, port, roomCode: parsedRoom } = parseRoomPayload(payload);
    setHostIp(ip);
    if (parsedRoom) setRoomCode(parsedRoom);
    connectToHost(ip, port, parsedRoom);
  };

  const connectToHost = (ip: string, port = 8080, code?: string) => {
    setStatus('CONNECTING');
    setErrorMessage(null);

    const targetUrl = `ws://${ip}:${port}`;
    const token = `player_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    try {
      const socket = new LocalClientSocket({
        url: targetUrl,
        playerToken: token,
        playerName: playerName.trim() || 'لاعب زائر',
        maxReconnectAttempts: 4,
        initialBackoffMs: 600,
      });

      socketRef.current = socket;

      const connectionTimeout = setTimeout(() => {
        if (socket.getStatus() !== 'CONNECTED') {
          socket.disconnect();
          setStatus('ERROR');
          setErrorMessage(
            'فشل الاتصال بمضيف الغرفة (انتهت المهلة). تأكد من اتصال كلا الجهازين بنفس شبكة الـ Wi-Fi وأن المضيف قام ببدء السيرفر.'
          );
        }
      }, 5000);

      socket.onStatusChange((sockStatus: ClientSocketStatus) => {
        if (sockStatus === 'CONNECTED') {
          clearTimeout(connectionTimeout);
          setStatus('SUCCESS');
          if (onConnected) {
            onConnected(socket, { ip, port, roomCode: code });
          }
        } else if (sockStatus === 'HOST_DROPPED') {
          clearTimeout(connectionTimeout);
          setStatus('ERROR');
          setErrorMessage('تعذر العثور على المضيف أو غادر الغرفة.');
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('ERROR');
      setErrorMessage(`خطأ أثناء محاولة الاتصال: ${msg}`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostIp.trim()) {
      setErrorMessage('يرجى إدخال عنوان IP الخاص بالمضيف.');
      return;
    }
    const { ip, port } = parseRoomPayload(hostIp);
    connectToHost(ip, port, roomCode.trim() || undefined);
  };

  return (
    <div
      dir="rtl"
      className={`min-h-screen w-full bg-neutral-950 flex justify-center items-center p-0 sm:p-4 text-amber-50 select-none ${className}`}
    >
      <div className="relative w-full max-w-md h-[100dvh] sm:h-[844px] sm:max-h-[92vh] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col wood-rail border border-amber-900/40">
        
        {/* Top Header */}
        <header className="relative z-10 px-4 py-3 flex items-center justify-between border-b border-amber-500/20 bg-gradient-to-b from-black/80 to-black/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-neutral-800 text-amber-300 hover:text-white flex items-center justify-center cursor-pointer active:scale-95 transition-colors"
              aria-label="الرجوع"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-amber-300 leading-none">
                الانضمام لغرفة
              </h1>
              <p className="text-[11px] text-amber-200/60 font-medium">
                الاتصال بشبكة اللعب المحلية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>Wi-Fi محلي</span>
          </div>
        </header>

        {/* Tab Switcher: Scan vs Manual */}
        <div className="px-4 pt-3 pb-1">
          <div className="grid grid-cols-2 gap-2 bg-black/60 p-1 rounded-2xl border border-amber-500/20">
            <button
              type="button"
              onClick={() => {
                setMode('SCAN');
                setStatus('IDLE');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'SCAN'
                  ? 'bg-amber-400 text-black shadow-md font-extrabold'
                  : 'text-amber-200/70 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>مسح رمز QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('MANUAL');
                scannerRef.current.stopScan();
                setStatus('IDLE');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'MANUAL'
                  ? 'bg-amber-400 text-black shadow-md font-extrabold'
                  : 'text-amber-200/70 hover:text-white'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>إدخال يدوي</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          
          {/* Player Name Input */}
          <div className="bg-black/40 border border-amber-500/20 rounded-2xl p-3 shadow-md backdrop-blur-xs">
            <label className="block text-[11px] font-bold text-amber-200/80 mb-1">
              اسمك في اللعبة:
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="مثال: فهد، محمد..."
              className="w-full bg-black/60 border border-neutral-700/60 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Mode 1: Camera QR Scanner */}
          {mode === 'SCAN' && (
            <div className="bg-black/40 border border-amber-500/20 rounded-2xl p-4 shadow-md backdrop-blur-xs flex flex-col items-center text-center">
              <div className="relative w-60 h-60 rounded-2xl overflow-hidden border-2 border-dashed border-amber-400/50 bg-black flex items-center justify-center mb-3">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {status !== 'SCANNING' && (
                  <div className="absolute inset-0 bg-neutral-900/90 flex flex-col items-center justify-center p-4">
                    <Camera className="w-10 h-10 text-amber-400/60 mb-2" />
                    <span className="text-xs text-amber-200/70">
                      اضغط بالأسفل لتشغيل الكاميرا ومسح رمز المضيف
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={status === 'CONNECTING'}
                onClick={handleStartScan}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold text-xs border border-emerald-400/40 shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>{status === 'SCANNING' ? 'جارِ المسح...' : 'تشغيل الكاميرا للمسح'}</span>
              </button>
            </div>
          )}

          {/* Mode 2: Manual IP & Room Code Form */}
          {mode === 'MANUAL' && (
            <form
              onSubmit={handleManualSubmit}
              className="bg-black/40 border border-amber-500/20 rounded-2xl p-4 shadow-md backdrop-blur-xs space-y-3"
            >
              <div>
                <label className="block text-[11px] font-bold text-amber-200/80 mb-1">
                  عنوان السيرفر (IP الخاص بالمضيف):
                </label>
                <input
                  type="text"
                  value={hostIp}
                  onChange={(e) => setHostIp(e.target.value)}
                  placeholder="192.168.1.xxx أو ws://192.168.1.xxx:8080"
                  className="w-full bg-black/60 border border-neutral-700/60 rounded-xl px-3 py-2 text-sm text-emerald-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-amber-200/50 block mt-1">
                  يظهر هذا العنوان على شاشة المضيف عند فتح رمز QR.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-200/80 mb-1">
                  رمز الغرفة (اختياري - ٦ أرقام):
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="مثال: 482910"
                  className="w-full bg-black/60 border border-neutral-700/60 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono font-bold tracking-wider focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={status === 'CONNECTING'}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm shadow-xl active:scale-98 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {status === 'CONNECTING' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارِ الاتصال...</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>اتصال بالغرفة</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Status / Error Box */}
          {status === 'ERROR' && errorMessage && (
            <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-4 shadow-lg text-rose-200 animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-right">
                  <h3 className="text-xs font-bold text-rose-300 mb-1">
                    فشل الاتصال
                  </h3>
                  <p className="text-[11px] leading-relaxed text-rose-200/80">
                    {errorMessage}
                  </p>
                </div>
              </div>

              {/* Retry Button */}
              <button
                type="button"
                onClick={() => {
                  if (mode === 'SCAN') handleStartScan();
                  else handleManualSubmit({ preventDefault: () => {} } as any);
                }}
                className="w-full mt-3 py-2 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-xs font-bold text-white border border-rose-500/40 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة المحاولة (Retry)</span>
              </button>
            </div>
          )}

          {/* Connecting State */}
          {status === 'CONNECTING' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center flex flex-col items-center">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin mb-2" />
              <span className="text-xs font-bold text-amber-300">
                جارِ التفاوض والاتصال بسيرفر المضيف...
              </span>
              <span className="text-[10px] text-amber-200/60 mt-0.5">
                تأكد من إبقاء شاشة المضيف مفتوحة
              </span>
            </div>
          )}

          {/* Success State */}
          {status === 'SUCCESS' && (
            <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-4 text-center flex flex-col items-center text-emerald-200">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 mb-1" />
              <span className="text-sm font-black text-white">تم الاتصال بالغرفة بنجاح!</span>
              <span className="text-[11px] text-emerald-300/80 mt-1">
                تم تثبيت مقعدك وجارِ مزامنة أوراق اللعبة...
              </span>
            </div>
          )}

        </div>

        {/* Footer */}
        <footer className="relative z-10 px-4 py-2.5 border-t border-amber-500/20 bg-black/80 text-[10px] text-amber-200/50 flex items-center justify-between">
          <span>آي كوت • لعب جماعي محلي</span>
          <span>منفذ السيرفر: 8080</span>
        </footer>

      </div>
    </div>
  );
};

export default JoinScreen;
