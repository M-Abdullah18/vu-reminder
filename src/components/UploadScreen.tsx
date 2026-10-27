import React, { useState, useRef } from 'react';
import { ExtractionResponse } from '../types';
import {
  UploadCloud,
  FileText,
  Image,
  AlertCircle,
  ShieldCheck,
  Check,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';

interface UploadScreenProps {
  onExtractionSuccess: (data: ExtractionResponse, fileName: string) => void;
  hasAgreedPrivacy: boolean;
  onAgreePrivacy: () => void;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onExtractionSuccess,
  hasAgreedPrivacy,
  onAgreePrivacy,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setErrorMessage(null);

    // Validate type
    const validMimes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'application/pdf',
    ];
    if (!validMimes.includes(file.type)) {
      setErrorMessage(
        'Unsupported file format. Please upload a PNG, JPG, or PDF document.'
      );
      return;
    }

    // Validate size (25MB cap)
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25MB limit. Please upload a smaller document.');
      return;
    }

    // Check privacy consent
    if (!hasAgreedPrivacy) {
      setPendingFile(file);
      setShowPrivacyModal(true);
      return;
    }

    performExtraction(file);
  };

  const confirmPrivacyAndProceed = () => {
    onAgreePrivacy();
    setShowPrivacyModal(false);
    if (pendingFile) {
      performExtraction(pendingFile);
      setPendingFile(null);
    }
  };

  const performExtraction = async (file: File) => {
    setIsProcessing(true);
    setProcessingStatus('Reading and compressing document in memory...');

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file from disk.'));
      });
      reader.readAsDataURL(file);
      const dataUrl = await base64Promise;

      setProcessingStatus('Analyzing document structure with Gemini 3.8 Flash...');

      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: dataUrl,
          mimeType: file.type,
          fileName: file.name,
        }),
      });

      setProcessingStatus('Validating Pakistan Standard Time formats & integrity...');

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to process document with Gemini AI.');
      }

      const extractedData: ExtractionResponse = result.data;
      if (!extractedData.tasks || extractedData.tasks.length === 0) {
        setErrorMessage(
          'Gemini could not detect any academic deadlines or assignments in this document. You can create a task manually using the "+ New Task" button.'
        );
        setIsProcessing(false);
        return;
      }

      onExtractionSuccess(extractedData, file.name);
    } catch (err: any) {
      console.error('Extraction failure:', err);
      setErrorMessage(
        err.message || 'Network error or server unavailable. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Demo / Sample Ingestion
  const handleQuickDemo = () => {
    const sampleExtraction: ExtractionResponse = {
      documentSummary:
        'Official Virtual University of Pakistan LMS announcement for Fall 2026 semester activities.',
      tasks: [
        {
          courseCode: 'CS504',
          courseName: 'Software Engineering - I',
          activityType: 'Assignment',
          title: 'Assignment No. 1 (Requirement Engineering)',
          instructions:
            'Prepare and submit your solution in MS Word (.doc or .docx) format only. Solution submitted via email will not be accepted.',
          rawDeadlineText: 'Due Date: Nov 15, 2026 11:59 PM PKT',
          isoDeadline: '2026-11-15T18:59:00.000Z',
          deadlineStatus: 'exact',
          rawOpeningDateText: 'Open Date: Nov 08, 2026',
          isoOpeningDate: '2026-11-08T00:00:00.000Z',
          totalMarks: '20',
          gracePeriod: '24 Hours Grace Period will be given',
          sourceReference: 'Page 1 - LMS Notice Table',
          confidence: {
            overall: 'High',
            courseCode: 'High',
            title: 'High',
            deadline: 'High',
            rationale: 'Clear course code, due date, and instructions in LMS screenshot.',
          },
          ambiguityFlags: [],
        },
        {
          courseCode: 'MTH302',
          courseName: 'Business Mathematics & Statistics',
          activityType: 'Quiz',
          title: 'Quiz # 2 (Lectures 11 to 20)',
          instructions:
            'Quiz will remain open for 48 hours. Total 10 MCQs with 90 seconds per question.',
          rawDeadlineText: 'Closing Date: Nov 12, 2026',
          isoDeadline: '2026-11-12T18:59:00.000Z',
          deadlineStatus: 'ambiguous',
          rawOpeningDateText: 'Open Date: Nov 10, 2026',
          isoOpeningDate: '2026-11-10T00:00:00.000Z',
          totalMarks: '10',
          gracePeriod: '',
          sourceReference: 'Page 1 - Notice Board',
          confidence: {
            overall: 'Medium',
            courseCode: 'High',
            title: 'High',
            deadline: 'Medium',
            rationale: 'Closing time was not explicitly written; defaulted to 23:59 PKT.',
          },
          ambiguityFlags: [
            'Closing time not specified; defaulted to 23:59 PKT (Requires user confirmation).',
          ],
        },
      ],
    };

    onExtractionSuccess(sampleExtraction, 'Sample_VU_LMS_Announcement.png');
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="mb-6 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          AI Academic Task Extractor
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-lg mx-auto">
          Upload an LMS announcement screenshot, assignment question file, or quiz notice (PNG, JPG,
          or PDF) to extract deadlines automatically.
        </p>
      </div>

      {/* Error Callout */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
            <button
              onClick={() => {
                setErrorMessage(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="mt-2 text-sky-400 hover:text-sky-300 underline font-medium"
            >
              Dismiss and try another file
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
            : 'border-slate-700/80 hover:border-slate-500 bg-[#0f172a]/80'
        } ${isProcessing ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {isProcessing ? (
          <div className="py-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 mb-4 animate-spin">
              <RefreshCw className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Extracting VU Deadlines with AI
            </h3>
            <p className="text-xs text-sky-400 font-mono animate-pulse">{processingStatus}</p>
            <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-4 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-sky-400 to-blue-500 animate-indeterminate" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 shadow-lg shadow-sky-500/10">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Drop LMS Screenshot or PDF here
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Supports PNG, JPG, JPEG, and multi-page PDFs (up to 25MB)
            </p>
            <span className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors">
              Browse Files from Device
            </span>
          </div>
        )}
      </div>

      {/* Quick Testing Shortcut */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <span>Don't have a screenshot ready? Test with sample VU LMS data:</span>
        </div>
        <button
          onClick={handleQuickDemo}
          className="px-3.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold transition-colors shrink-0 whitespace-nowrap"
        >
          Load Sample Announcement
        </button>
      </div>

      {/* Security & Privacy Notice */}
      <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-300">Data Privacy:</strong> Documents are processed in-memory
          via a secure server proxy using Google's Gemini 3.8 Flash model. Uploaded files are never
          stored on disk or retained after extraction. All extracted tasks remain stored locally on
          this device in IndexedDB.
        </p>
      </div>

      {/* First-Use Privacy Consent Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">First-Time Privacy Notice</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              To extract dates, course codes, and instructions, your uploaded screenshot or PDF will be
              sent to Google's Gemini API. Content processed by Gemini free-tier endpoints may be used
              by Google to improve products.
            </p>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 mb-5">
              ✓ No files are saved on our servers.
              <br />
              ✓ Tasks are stored strictly on this device.
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowPrivacyModal(false);
                  setPendingFile(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmPrivacyAndProceed}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
              >
                I Understand & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
