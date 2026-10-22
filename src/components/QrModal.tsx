/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  QrCode as QrIcon,
  Wifi,
  Sparkles,
  Edit2,
  CheckCircle,
} from 'lucide-react';
import { encodeRoomPayload, getLocalIpAddress } from '../network/localIp';

export interface QrModalProps {
  roomCode: string;
  initialIp?: string;
  port?: number;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const QrModal: React.FC<QrModalProps> = ({
  roomCode,
  initialIp,
  port = 8080,
  isOpen,
  onClose,
  className = '',
}) => {
  const [ip, setIp] = useState<string>(initialIp || '192.168.1.105');
  const [isEditingIp, setIsEditingIp] = useState<boolean>(false);
  const [tempIp, setTempIp] = useState<string>(ip);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  useEffect(() => {
    if (!initialIp) {
      getLocalIpAddress().then((detected) => {
        setIp(detected);
        setTempIp(detected);
      });
    }
  }, [initialIp]);

  // Generate QR whenever IP, port, or roomCode changes
  useEffect(() => {
    if (!isOpen) return;

    const payload = encodeRoomPayload(ip, port, roomCode);
    QRCode.toDataURL(payload, {
      width: 250,
      margin: 2,
      color: {
        dark: '#052e16', // Deep emerald dark
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [ip, port, roomCode, isOpen]);

  if (!isOpen) return null;

  const connectionUrl = `ws://${ip}:${port}`;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(connectionUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSaveIp = () => {
    if (tempIp.trim()) {
      setIp(tempIp.trim());
    }
    setIsEditingIp(false);
  };

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-amber-50 select-none animate-in fade-in duration-200 ${className}`}
    >
      <div className="relative w-full max-w-sm bg-neutral-900 border border-amber-500/40 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 flex items-center justify-center cursor-pointer active:scale-95 transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-emerald-900/80 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <QrIcon className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-amber-300">رمز الانضمام للغرفة</h2>
        </div>
        <p className="text-[11px] text-amber-200/60 mb-3">
          امسح الرمز بكاميرا الجوال أو أدخل الرمز يدوياً
        </p>

        {/* QR Code Container */}
        <div className="relative bg-white p-3 rounded-2xl shadow-xl border-4 border-amber-400/40 mb-3">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code للانضمام"
              className="w-48 h-48 sm:w-52 sm:h-52 rounded-lg object-contain"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-neutral-400 text-xs">
              جارِ توليد الرمز...
            </div>
          )}
          <div className="absolute -bottom-2 -right-2 bg-amber-400 text-black p-1 rounded-full shadow">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 6-Digit Room Code Display */}
        <div className="w-full bg-black/60 border border-amber-400/30 rounded-2xl p-2.5 mb-2.5 flex items-center justify-between">
          <div className="text-right">
            <span className="text-[10px] text-amber-200/60 block">رمز الغرفة:</span>
            <span className="text-xl font-mono font-black tracking-widest text-amber-300">
              {roomCode}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الرمز</span>
              </>
            )}
          </button>
        </div>

        {/* IP Address & Port Details */}
        <div className="w-full bg-black/40 border border-neutral-700/60 rounded-xl p-2.5 text-xs text-right mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-neutral-300">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-semibold">عنوان السيرفر (IP):</span>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingIp(!isEditingIp)}
              className="text-[10px] text-amber-300 hover:text-amber-200 flex items-center gap-0.5 cursor-pointer"
            >
              <Edit2 className="w-2.5 h-2.5" />
              <span>{isEditingIp ? 'إلغاء' : 'تعديل IP'}</span>
            </button>
          </div>

          {isEditingIp ? (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="text"
                value={tempIp}
                onChange={(e) => setTempIp(e.target.value)}
                placeholder="192.168.1.xxx"
                className="flex-1 bg-black/60 border border-amber-400/40 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-amber-300"
              />
              <button
                type="button"
                onClick={handleSaveIp}
                className="p-1 bg-emerald-600 text-white rounded cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-mono text-xs font-bold text-emerald-300 select-all">
                {connectionUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="text-[10px] text-amber-300/80 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>نسخ الرابط</span>
              </button>
            </div>
          )}
        </div>

        {/* Done / Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold text-xs border border-emerald-500/40 shadow-lg active:scale-98 cursor-pointer"
        >
          تم
        </button>
      </div>
    </div>
  );
};

export default QrModal;
