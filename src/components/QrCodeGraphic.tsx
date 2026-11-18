import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeGraphicProps {
  value: string;
  size?: number;
  label?: string;
  className?: string;
}

export const QrCodeGraphic: React.FC<QrCodeGraphicProps> = ({
  value,
  size = 104,
  label,
  className = '',
}) => {
  return (
    <div className={`print-avoid-break inline-flex flex-col items-center ${className}`}>
      <div className="print-qr-box rounded-lg border border-slate-200 bg-white p-1.5 shadow-xs">
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          bgColor="#FFFFFF"
          fgColor="#142D4E"
          marginSize={1}
          className="print-qr-svg block"
          role="img"
          aria-label={label ? `QR code for ${label}` : `QR code for ${value}`}
        />
      </div>
      {label && (
        <span className="print-qr-label mt-1 font-mono-num text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
    </div>
  );
};
