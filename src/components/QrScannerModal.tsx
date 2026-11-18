import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FlaskConical,
  Keyboard,
  QrCode,
  Search,
  Upload,
  UserCheck,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { Modal } from './Modal';
import { QrCodeGraphic } from './QrCodeGraphic';
import {
  buildLabReportQrValue,
  buildPatientQrValue,
  decodeQrFromImageData,
  decodeQrFromImageFile,
  parseQrPayload,
} from '../utils/qrCode';
import { LabTest, Patient } from '../types/hospital';

type ScanMode = 'manual' | 'camera' | 'upload';

type ResolvedMatch =
  | { kind: 'patient'; patient: Patient; raw: string }
  | { kind: 'lab'; lab: LabTest; raw: string };

export const QrScannerModal: React.FC = () => {
  const {
    qrScannerOpen,
    setQrScannerOpen,
    patients,
    labTests,
    beds,
    navigateToQrTarget,
    allowedPages,
  } = useHospital();

  const [mode, setMode] = useState<ScanMode>('manual');
  const [codeInput, setCodeInput] = useState('');
  const [selectedSample, setSelectedSample] = useState('');
  const [match, setMatch] = useState<ResolvedMatch | null>(null);
  const [scanError, setScanError] = useState('');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('idle');
  }, []);

  const resolveRawCode = useCallback(
    (rawValue: string) => {
      const trimmed = rawValue.trim();
      if (!trimmed) {
        setMatch(null);
        setScanError('');
        return;
      }

      const parsed = parseQrPayload(trimmed);
      if (parsed?.type === 'patient') {
        const found = patients.find((p) => p.id.toLowerCase() === parsed.id.toLowerCase());
        if (found) {
          setMatch({ kind: 'patient', patient: found, raw: trimmed });
          setScanError('');
          return;
        }
      }

      if (parsed?.type === 'lab') {
        const found = labTests.find((t) => t.id.toLowerCase() === parsed.id.toLowerCase());
        if (found) {
          setMatch({ kind: 'lab', lab: found, raw: trimmed });
          setScanError('');
          return;
        }
      }

      // Direct case-insensitive fallback against patient IDs or lab IDs
      const directPatient = patients.find((p) => p.id.toLowerCase() === trimmed.toLowerCase());
      if (directPatient) {
        setMatch({ kind: 'patient', patient: directPatient, raw: trimmed });
        setScanError('');
        return;
      }
      const directLab = labTests.find((t) => t.id.toLowerCase() === trimmed.toLowerCase());
      if (directLab) {
        setMatch({ kind: 'lab', lab: directLab, raw: trimmed });
        setScanError('');
        return;
      }

      setMatch(null);
      setScanError(`Decoded "${trimmed}", but no matching patient wristband or lab report was found.`);
    },
    [patients, labTests]
  );

  // Reset state cleanly when modal closes or switches back to manual
  useEffect(() => {
    if (!qrScannerOpen) {
      stopCamera();
      return;
    }
    if (mode === 'manual') {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
      return () => window.clearTimeout(timer);
    }
  }, [qrScannerOpen, mode, stopCamera]);

  // Camera live scan loop
  useEffect(() => {
    if (!qrScannerOpen || mode !== 'camera') {
      stopCamera();
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus('error');
        setCameraError('Camera API is unavailable in this browser context. Use Code Input or Upload Image.');
        return;
      }

      setCameraStatus('starting');
      setCameraError('');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraStatus('active');

        const scanFrame = () => {
          if (cancelled || !videoRef.current || !canvasRef.current) return;
          const video = videoRef.current;
          if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const decoded = decodeQrFromImageData(frame.data, frame.width, frame.height);
              if (decoded) {
                setCodeInput(decoded);
                resolveRawCode(decoded);
                stopCamera();
                return;
              }
            }
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        };

        rafRef.current = requestAnimationFrame(scanFrame);
      } catch {
        if (!cancelled) {
          setCameraStatus('error');
          setCameraError(
            'Camera permission was denied or no camera hardware was detected. Use Code Input or Upload QR Image.'
          );
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [qrScannerOpen, mode, stopCamera, resolveRawCode]);

  const handleClose = () => {
    stopCamera();
    setQrScannerOpen(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resolveRawCode(codeInput);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const decoded = await decodeQrFromImageFile(file);
      if (!decoded) {
        setMatch(null);
        setScanError('No valid QR code could be detected in the uploaded image.');
        return;
      }
      setCodeInput(decoded);
      resolveRawCode(decoded);
    } catch {
      setMatch(null);
      setScanError('Could not read the selected image file.');
    }
  };

  const sampleOptions = useMemo(() => {
    const items: { key: string; label: string; payload: string }[] = [];
    patients.slice(0, 6).forEach((p) => {
      items.push({
        key: `pat-${p.id}`,
        label: `Wristband · ${p.fullName} (${p.id})`,
        payload: buildPatientQrValue(p.id),
      });
    });
    labTests.slice(0, 6).forEach((t) => {
      items.push({
        key: `lab-${t.id}`,
        label: `Lab Report · ${t.testName} (${t.id})`,
        payload: buildLabReportQrValue(t.id),
      });
    });
    return items;
  }, [patients, labTests]);

  const matchedPatientBed = useMemo(() => {
    if (match?.kind !== 'patient') return null;
    return (
      beds.find(
        (b) =>
          b.patientId === match.patient.id &&
          (b.status === 'Occupied' || b.status === 'Reserved')
      ) ?? null
    );
  }, [match, beds]);

  const matchedPatientLabsCount = useMemo(() => {
    if (match?.kind !== 'patient') return 0;
    return labTests.filter((t) => t.patientId === match.patient.id).length;
  }, [match, labTests]);

  return (
    <Modal
      open={qrScannerOpen}
      onClose={handleClose}
      title="QR Record Lookup & Scanner"
      subtitle="Scan a patient wristband or lab report QR code to retrieve live clinical records"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Scan Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#F3F6FB] dark:bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'manual'
                ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span>Code / Scanner Input</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('camera')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'camera'
                ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Camera Scan</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'upload'
                ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload QR Image</span>
          </button>
        </div>

        {/* Mode 1: Manual / Handheld Scanner Input */}
        {mode === 'manual' && (
          <div className="space-y-4">
            <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Scan or enter QR URL, PAT:ID, or LAB:ID (e.g. PAT-2026-0001)"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F3F6FB] dark:bg-slate-800 py-2.5 pl-9 pr-3 text-sm font-mono-num text-[#1E293B] dark:text-white focus:border-[#2563EB] focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
              >
                <QrCode className="h-4 w-4" />
                <span>Retrieve Record</span>
              </button>
            </form>

            {/* Quick Sample Selector for instant verification */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5">
              <label
                htmlFor="qr-sample-select"
                className="block text-xs font-semibold text-[#142D4E] dark:text-slate-200 mb-2"
              >
                Quick Simulate Scan from Active Hospital Records
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  id="qr-sample-select"
                  value={selectedSample}
                  onChange={(e) => {
                    const payload = e.target.value;
                    setSelectedSample(payload);
                    if (payload) {
                      setCodeInput(payload);
                      resolveRawCode(payload);
                    }
                  }}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-[#1E293B] dark:text-slate-100 focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="">Select a patient wristband or lab report to scan...</option>
                  {sampleOptions.map((opt) => (
                    <option key={opt.key} value={opt.payload}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: Live Camera Preview */}
        {mode === 'camera' && (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`h-full w-full object-cover ${cameraStatus === 'active' ? 'block' : 'hidden'}`}
              />
              <canvas ref={canvasRef} className="hidden" />
              {cameraStatus === 'active' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-44 w-44 rounded-xl border-2 border-[#16B8A6] shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]" />
                </div>
              )}
              {cameraStatus === 'starting' && (
                <p className="text-xs text-slate-300">Initializing camera stream...</p>
              )}
              {cameraStatus === 'error' && (
                <div className="max-w-sm px-6 text-center space-y-2">
                  <AlertCircle className="h-7 w-7 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-200 leading-relaxed">{cameraError}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hold a printed patient wristband or lab report QR code inside the frame for automatic lookup.
            </p>
          </div>
        )}

        {/* Mode 3: Upload QR Image */}
        {mode === 'upload' && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-6 text-center space-y-3">
            <Upload className="h-7 w-7 text-[#2563EB] mx-auto" />
            <div>
              <p className="text-sm font-semibold text-[#142D4E] dark:text-white">
                Decode Downloaded QR Code Image
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Upload a PNG or JPG QR image exported from a patient wristband or lab report.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Choose QR Image File</span>
            </button>
          </div>
        )}

        {/* Error Notice */}
        {scanError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{scanError}</span>
          </div>
        )}

        {/* Retrieved Patient Record Card */}
        {match?.kind === 'patient' && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-white dark:bg-slate-900 p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Patient Wristband Verified</span>
                  </div>
                  <h3 className="mt-0.5 font-display text-base font-bold text-[#142D4E] dark:text-white">
                    {match.patient.fullName}
                  </h3>
                  <p className="font-mono-num text-xs text-[#2563EB]">{match.patient.id}</p>
                </div>
              </div>
              <QrCodeGraphic value={buildPatientQrValue(match.patient.id)} size={68} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Age &amp; Gender</span>
                <div className="mt-0.5 font-semibold text-[#142D4E] dark:text-white">
                  {match.patient.age} yrs · {match.patient.gender}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Blood Group</span>
                <div className="mt-0.5 font-mono-num font-bold text-rose-600 dark:text-rose-400">
                  {match.patient.bloodGroup}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Care Status</span>
                <div className="mt-0.5 font-semibold text-[#142D4E] dark:text-white">
                  {matchedPatientBed
                    ? `${matchedPatientBed.wardName} · ${matchedPatientBed.bedNumber}`
                    : 'Outpatient'}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Records Linked</span>
                <div className="mt-0.5 font-mono-num font-semibold text-[#142D4E] dark:text-white">
                  {match.patient.medicalHistory.length} notes · {matchedPatientLabsCount} labs
                </div>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <span className="text-slate-400">Known Allergies</span>
                <div className="mt-0.5 font-medium text-[#1E293B] dark:text-slate-200">
                  {match.patient.allergies || 'None reported'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-3">
              {allowedPages.includes('patients') ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      navigateToQrTarget({
                        type: 'patient',
                        id: match.patient.id,
                        action: 'wristband',
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-[#142D4E] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Open Wristband</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigateToQrTarget({
                        type: 'patient',
                        id: match.patient.id,
                        action: 'profile',
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
                  >
                    <span>Open Full Patient Profile</span>
                  </button>
                </>
              ) : (
                <p className="text-xs text-amber-600">
                  Your current role does not have access to the Patients directory.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Retrieved Lab Report Card */}
        {match?.kind === 'lab' && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-white dark:bg-slate-900 p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Laboratory Report Retrieved</span>
                  </div>
                  <h3 className="mt-0.5 font-display text-base font-bold text-[#142D4E] dark:text-white">
                    {match.lab.testName}
                  </h3>
                  <p className="font-mono-num text-xs text-[#2563EB]">
                    {match.lab.id} · {match.lab.category}
                  </p>
                </div>
              </div>
              <QrCodeGraphic value={buildLabReportQrValue(match.lab.id)} size={68} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Patient</span>
                <div className="mt-0.5 font-semibold text-[#142D4E] dark:text-white">
                  {match.lab.patientName}
                </div>
                <div className="font-mono-num text-[11px] text-slate-500">{match.lab.patientId}</div>
              </div>
              <div>
                <span className="text-slate-400">Ordering Physician</span>
                <div className="mt-0.5 font-semibold text-[#142D4E] dark:text-white">
                  {match.lab.orderedByDoctor}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Status</span>
                <div className="mt-0.5 font-semibold text-[#142D4E] dark:text-white">
                  {match.lab.status}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Reference Interval</span>
                <div className="mt-0.5 font-mono-num text-[#142D4E] dark:text-white">
                  {match.lab.referenceRange || 'Standard'}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <span className="text-slate-400">Observed Results</span>
                <div className="mt-0.5 text-sm font-medium text-[#142D4E] dark:text-white">
                  {match.lab.resultSummary || 'Results pending laboratory completion.'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-3">
              {allowedPages.includes('laboratory') ? (
                <button
                  type="button"
                  onClick={() =>
                    navigateToQrTarget({
                      type: 'lab',
                      id: match.lab.id,
                      action: 'report',
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
                >
                  <span>Open Printable Lab Report</span>
                </button>
              ) : (
                <p className="text-xs text-amber-600">
                  Your current role does not have access to Laboratory records.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
