import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ResetModal({ isOpen, onClose, onConfirm }: ResetModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            id="reset-lab-dialog"
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm bg-neutral-900 border border-rose-900/60 rounded-xl p-4 sm:p-5 shadow-2xl text-neutral-100 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reset Lab Environment?</h3>
                  <p className="text-xs text-rose-300/80">Confirmation required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-300 space-y-2 leading-relaxed bg-neutral-950 p-3 rounded-md border border-neutral-800">
              <p>
                This action will revert your virtual machine back to the <strong>clean Phase 1 baseline</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-neutral-400 pl-1">
                <li>Deletes any files or folders created by the student</li>
                <li>Revives all terminated processes (Notepad, Chrome)</li>
                <li>Restores default user accounts and working directory</li>
                <li>Clears active terminal command variables</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                Keep My Work
              </button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                id="confirm-reset-btn"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yes, Reset Everything</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
