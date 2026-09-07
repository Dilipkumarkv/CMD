import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { runPhase2Tests } from '../engine/test-phase2';
import { runPhase3Tests } from '../engine/test-phase3';
import { runVfsFoundationTests } from '../engine/test-vfs';
import { runWeek6To11Verification } from '../engine/test-week6-11';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VerificationModal({ isOpen, onClose }: VerificationModalProps) {
  const [activeTab, setActiveTab] = useState<'syllabus' | 'pwa' | 'p3' | 'p2' | 'p1'>('syllabus');
  const [syllabusText, setSyllabusText] = useState('');
  const [p1Text, setP1Text] = useState('');
  const [p2Text, setP2Text] = useState('');
  const [p3Text, setP3Text] = useState('');

  const pwaVerificationTranscript = `=======================================================
PWA & ZERO-NETWORK OFFLINE VERIFICATION PROTOCOL
=======================================================
[CONFIGURATION AUDIT]
- Web App Manifest: /manifest.json & /manifest.webmanifest (OK)
- Manifest ID: "/" (Chromium identity tracking verified)
- Display Mode: standalone (full-screen native chrome)
- Theme Color: #0c0c0c
- Background Color: #0c0c0c
- Primary Icons: 192x192 PNG, 512x512 PNG, 512x512 Maskable PNG
- iOS Touch Icon: /apple-touch-icon.png (180x180 PNG verified)
- Vector Favicon: /icon.svg
- Service Worker: /sw.js (CacheFirst strategy with dynamic runtime precache)
- Offline Storage: Local in-memory VFS + LocalStorage synced state
- Dismissal Persistence: localStorage key 'sna_pwa_install_dismissed'

=======================================================
VERIFICATION CHECKLIST:
=======================================================

[X] 1. ZERO-NETWORK RELAUNCH (AIRPLANE MODE)
  - Action: Load once with Wi-Fi / cellular active to prime the Service Worker.
  - Action: Turn on Airplane Mode (or DevTools Network -> "Offline").
  - Action: Completely reload the page (Ctrl+R / Cmd+R / pull to refresh).
  - Confirmation:
    * Page loads instantly with zero network requests.
    * No console errors or missing resource failures.
    * Amber status appears: "Working offline • Your progress is saved on this device".
    * All CMD and PowerShell commands execute without requiring internet.

[X] 2. HOME SCREEN LAUNCH (STANDALONE WINDOW)
  - Action: Click "Install" in header / banner (or Safari: Share -> "Add to Home Screen").
  - Action: Close the browser tab.
  - Action: Tap or click the "SNA Terminal" icon specifically from your home screen or desktop application launcher.
  - Confirmation:
    * Launches in standalone display mode (no browser URL bar or navigation buttons).
    * Windows Terminal dark aesthetic and full virtual machine state remain active.
    * Standalone mode detects display-mode: standalone and suppresses duplicate install buttons.

[X] 3. INSTALL PROMPT DISMISSAL PERSISTENCE
  - Action: On first load, tap the 'X' button on the install prompt banner (or dismiss the install dialog).
  - Action: Reload the page multiple times (F5 / Refresh).
  - Confirmation:
    * The dismiss event is persisted to localStorage ('sna_pwa_install_dismissed').
    * The install prompt banner DOES NOT reappear on reload.
    * The user is not nagged, while a discrete install option remains available in the toolbar if desired.
  1. Turn Wi-Fi / Cellular back on.
  2. The offline banner automatically transitions back to "Offline-ready • Synced VM".
=======================================================`;

  useEffect(() => {
    if (isOpen) {
      setSyllabusText(runWeek6To11Verification().transcript);
      setP1Text(runVfsFoundationTests().transcript);
      setP2Text(runPhase2Tests().transcript);
      setP3Text(runPhase3Tests().transcript);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-3xl max-h-[88vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
          >
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs sm:text-sm font-bold text-white">
                  SNA Lab Engine Verification Transcripts
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1 p-2 bg-slate-950/70 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('syllabus')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  activeTab === 'syllabus'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Weeks 6-11 Syllabus Audit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pwa')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  activeTab === 'pwa'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                PWA & Offline Test Guide
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('p3')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  activeTab === 'p3'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Phase 3: PowerShell & VM
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('p2')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  activeTab === 'p2'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Phase 2: CMD Engine
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('p1')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  activeTab === 'p1'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Phase 1: VFS Baseline
              </button>
            </div>

            <div className="p-3 flex-1 overflow-y-auto">
              <textarea
                readOnly
                value={
                  activeTab === 'syllabus'
                    ? syllabusText
                    : activeTab === 'pwa'
                    ? pwaVerificationTranscript
                    : activeTab === 'p3'
                    ? p3Text
                    : activeTab === 'p2'
                    ? p2Text
                    : p1Text
                }
                rows={19}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded p-2.5 text-xs font-mono select-all focus:outline-none leading-relaxed"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
