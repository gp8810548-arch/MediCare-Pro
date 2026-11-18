import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildPatientQrValue } from '../utils/qrCode';

/**
 * @param {object} props
 * @param {string} props.patientId
 * @param {string} [props.patientName]
 * @param {number} [props.size]
 * @param {'id' | 'url'} [props.encodeMode]
 * @param {string} [props.caption]
 * @param {boolean} [props.showIdLabel]
 * @param {string} [props.className]
 */
export const PatientQrCode = ({
  patientId,
  patientName,
  size = 84,
  encodeMode = 'id',
  caption,
  showIdLabel = true,
  className = '',
}) => {
  if (!patientId) return null;
  const qrValue = encodeMode === 'url' ? buildPatientQrValue(patientId) : patientId;

  return (
    <div className={`print-avoid-break inline-flex flex-col items-center ${className}`}>
      <div className="print-qr-box rounded-lg border border-slate-200 bg-white p-1.5 shadow-xs">
        <QRCodeSVG
          value={qrValue}
          size={size}
          level="M"
          bgColor="#FFFFFF"
          fgColor="#142D4E"
          marginSize={1}
          className="print-qr-svg block"
          role="img"
          aria-label={
            patientName
              ? `Scannable QR code for patient ${patientName} (${patientId})`
              : `Scannable QR code for Patient ID ${patientId}`
          }
        />
      </div>
      {(caption || showIdLabel) && (
        <div className="mt-1 text-center leading-tight">
          {caption && (
            <div className="print-qr-label text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {caption}
            </div>
          )}
          {showIdLabel && (
            <div className="print-qr-label font-mono-num text-[10px] font-semibold text-slate-600 dark:text-slate-400">
              {patientId}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientQrCode;
