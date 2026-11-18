import QRCode from 'qrcode';
import jsQR from 'jsqr';

export type QrRecordType = 'patient' | 'lab';

export interface QrRecordTarget {
  type: QrRecordType;
  id: string;
  action?: 'profile' | 'wristband' | 'report';
}

function getAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://medicare-pro.local';
}

export function buildPatientQrValue(patientId: string): string {
  return `${getAppOrigin()}/?qr=${encodeURIComponent(`PAT:${patientId}`)}`;
}

export function buildLabReportQrValue(labId: string): string {
  return `${getAppOrigin()}/?qr=${encodeURIComponent(`LAB:${labId}`)}`;
}

export function parseQrPayload(rawInput: string): { type: QrRecordType; id: string } | null {
  const raw = rawInput.trim();
  if (!raw) return null;

  // 1. Try parsing as URL containing ?qr=...
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.includes('?qr=')) {
      const url = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'https://medicare-pro.local');
      const qrParam = url.searchParams.get('qr');
      if (qrParam) {
        return parseQrPayload(decodeURIComponent(qrParam));
      }
    }
  } catch {
    // Fall through to token parsing
  }

  // 2. Try parsing JSON payload
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { type?: string; id?: string };
      if ((parsed.type === 'patient' || parsed.type === 'lab') && typeof parsed.id === 'string' && parsed.id.trim()) {
        return { type: parsed.type, id: parsed.id.trim() };
      }
    } catch {
      // Fall through
    }
  }

  // 3. Parse protocol / prefixed tokens (e.g. PAT:PAT-2026-0001, MEDICARE://PAT/..., LAB:LAB-2026-001)
  const normalized = raw.replace(/^MEDICARE:\/\//i, '').replace(/^MEDICARE:/i, '');
  const upper = normalized.toUpperCase();

  if (upper.startsWith('PAT:') || upper.startsWith('PAT/')) {
    const id = normalized.slice(4).trim();
    return id ? { type: 'patient', id } : null;
  }

  if (upper.startsWith('LAB:') || upper.startsWith('LAB/')) {
    const id = normalized.slice(4).trim();
    return id ? { type: 'lab', id } : null;
  }

  // 4. Bare record IDs (e.g. PAT-2026-0001, LAB-2026-001)
  if (/^PAT[-_]/i.test(raw)) {
    return { type: 'patient', id: raw.toUpperCase() };
  }
  if (/^LAB[-_]/i.test(raw)) {
    return { type: 'lab', id: raw.toUpperCase() };
  }

  return null;
}

export function createQrSvgMatrix(value: string): { size: number; pathData: string } {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const parts: string[] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (data[row * size + col]) {
        parts.push(`M${col},${row}h1v1h-1z`);
      }
    }
  }

  return { size, pathData: parts.join('') };
}

export async function generateQrPngDataUrl(value: string, width = 320): Promise<string> {
  return QRCode.toDataURL(value, {
    width,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#142D4E',
      light: '#FFFFFF',
    },
  });
}

export async function downloadQrPng(value: string, filename: string): Promise<void> {
  const dataUrl = await generateQrPngDataUrl(value, 400);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function decodeQrFromImageData(
  imageData: Uint8ClampedArray,
  width: number,
  height: number
): string | null {
  const result = jsQR(imageData, width, height, {
    inversionAttempts: 'attemptBoth',
  });
  return result?.data ?? null;
}

export function decodeQrFromImageFile(file: File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(decodeQrFromImageData(data.data, canvas.width, canvas.height));
      };
      img.onerror = () => reject(new Error('Unable to load image for QR decoding.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });
}
