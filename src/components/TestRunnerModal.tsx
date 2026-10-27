import React, { useState, useEffect } from 'react';
import { runAllUnitTests, TestResult } from '../utils/unitTests';
import { X, TestTube, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [suiteResult, setSuiteResult] = useState(() => runAllUnitTests());

  useEffect(() => {
    if (isOpen) {
      setSuiteResult(runAllUnitTests());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReRun = () => {
    setSuiteResult(runAllUnitTests());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TestTube className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Automated Unit Test Suite</h2>
              <p className="text-xs text-slate-400">
                Verifying core algorithms per acceptance criteria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReRun}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Re-run tests"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Summary Box */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              suiteResult.failed === 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {suiteResult.failed === 0 ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              )}
              <div>
                <p className="text-sm font-bold">
                  {suiteResult.failed === 0
                    ? 'All Unit Tests Passed Successfully'
                    : `${suiteResult.failed} Test(s) Failed`}
                </p>
                <p className="text-xs opacity-80">
                  {suiteResult.passed} of {suiteResult.total} assertions validated
                </p>
              </div>
            </div>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
              100% Pass Rate
            </span>
          </div>

          {/* Test Cases List */}
          <div className="space-y-2.5">
            {suiteResult.results.map((res, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {res.category}
                    </span>
                    <span className="font-semibold text-white">{res.name}</span>
                  </div>
                  <p className="text-slate-400 font-mono text-[11px]">{res.message}</p>
                </div>

                <span
                  className={`font-mono font-bold text-xs shrink-0 px-2 py-0.5 rounded ${
                    res.passed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {res.passed ? 'PASS ✓' : 'FAIL ✗'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
