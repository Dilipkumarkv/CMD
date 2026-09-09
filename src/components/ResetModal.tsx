import { motion, AnimatePresence } from 'motion/react';
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            id="reset-lab-dialog"
            role="dialog"
            aria-modal="true"
            className="w-full sm:max-w-sm bg-[#18181b] sm:rounded-xl rounded-t-xl rounded-b-none p-5 sm:p-6 text-neutral-100 space-y-5 border-t sm:border border-rose-900/40 shadow-[0_-10px_40px_-15px_rgba(225,29,72,0.2)] sm:shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Reset Lab Environment?</h3>
                  <p className="text-xs text-rose-300/80">This action is irreversible</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-xs text-neutral-300 space-y-2 leading-relaxed bg-black/40 p-4 rounded-lg border border-white/5 shadow-inner">
              <p>
                This will revert the virtual machine to its <strong>clean baseline</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-neutral-400 pl-1 marker:text-neutral-600">
                <li>Delete all student-created files/folders</li>
                <li>Restore default user accounts</li>
                <li>Clear terminal variables</li>
              </ul>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                id="confirm-reset-btn"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-[0_0_15px_rgba(225,29,72,0.4)] hover:shadow-[0_0_20px_rgba(225,29,72,0.6)]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Environment</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
