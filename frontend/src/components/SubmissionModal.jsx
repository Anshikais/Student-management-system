import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, ExternalLink, X, Loader2 } from 'lucide-react';

/**
 * Two-Step Submission Confirmation Modal
 * Step 1: User clicks "Yes, I have submitted" button on the assignment page.
 * Step 2: Modal opens asking explicit confirmation:
 *         "Have you uploaded your assignment to the OneDrive submission link?"
 *         Offers OneDrive link shortcut, Cancel, and Confirm Submission buttons.
 */
export default function SubmissionModal({
  isOpen,
  onClose,
  onConfirm,
  assignmentTitle,
  onedriveLink,
  isLeader = true,
  isLoading = false
}) {
  const [isChecked, setIsChecked] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  // Reset checkbox when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsChecked(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto scale-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 id="modal-title" className="text-lg font-semibold text-slate-800">
              Confirm Assignment Submission
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Assignment
            </p>
            <p className="text-base font-medium text-slate-900">
              {assignmentTitle}
            </p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 space-y-1">
              <p className="font-semibold">
                Have you uploaded your assignment to the OneDrive submission link?
              </p>
              <p className="text-amber-700">
                This action records the official submission on behalf of your entire group. Only the group leader can submit, and duplicate submissions are not allowed.
              </p>
            </div>
          </div>

          {onedriveLink && (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
              <span className="text-slate-600 truncate max-w-[280px]">
                {onedriveLink}
              </span>
              <a
                href={onedriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium shrink-0 ml-2"
              >
                <span>Verify OneDrive</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {!isLeader && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              ⚠️ Only the designated group leader has authorization to confirm this submission.
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer pt-2 select-none">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              disabled={isLoading || !isLeader}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm text-slate-700">
              I certify that our group has completed the work and uploaded the final deliverables to the designated OneDrive folder.
            </span>
          </label>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 sticky bottom-0 bg-slate-50/95">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={!isChecked || isLoading || !isLeader}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all shadow-blue-500/25"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Confirm Submission</span>
          </button>
        </div>
      </div>
    </div>
  );
}