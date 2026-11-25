import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { BonReception, User, CaisseItem, LotSummaryItem } from '../types';
import { api } from '../services/api';
import {
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  VolumeX,
  Trash2,
  Layers,
  Sparkles,
  QrCode,
  Check,
  Send,
  Plus
} from 'lucide-react';

interface CaisseScannerModalProps {
  bon: BonReception | null;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const CaisseScannerModal: React.FC<CaisseScannerModalProps> = ({
  bon,
  currentUser,
  onClose,
  onSuccess,
  showToast
}) => {
  if (!bon) return null;

  const [caisses, setCaisses] = useState<CaisseItem[]>([]);
  const [lots, setLots] = useState<LotSummaryItem[]>([]);
  const [totalCaisses, setTotalCaisses] = useState(0);
  const [totalPieces, setTotalPieces] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'simulator'>('scan');
  const [validating, setValidating] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScanRef = useRef(false);

  // Derive expected quantities from bon lines
  const firstLine = bon.lignes && bon.lignes[0];
  const articleCode = firstLine?.code_article || 'CORPS DN15';
  const articleName = firstLine?.designation_article || 'Corps DN15';
  const expectedPieces = Number(bon.quantite_totale) || 11088;
  const standardCaisseQty = 504;
  const expectedCaisses = Math.max(1, Math.ceil(expectedPieces / standardCaisseQty));

  // Audio Beep generator using Web Audio API
  const playBeep = (freq = 880, type: OscillatorType = 'sine', duration = 0.12) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay blocked or unsupported
    }
  };

  const playSuccessChime = () => {
    playBeep(880, 'sine', 0.08);
    setTimeout(() => playBeep(1320, 'sine', 0.12), 90);
    if (navigator.vibrate) {
      navigator.vibrate([60, 40, 80]);
    }
  };

  const playWarningBeep = () => {
    playBeep(320, 'triangle', 0.2);
    if (navigator.vibrate) {
      navigator.vibrate([150]);
    }
  };

  // Load existing caisses for this reception
  const loadCaissesData = async () => {
    try {
      setLoading(true);
      const res = await api.getCaissesByReception(bon.id);
      if (res.success) {
        setCaisses(res.caisses || []);
        setLots(res.lots || []);
        setTotalCaisses(res.total_caisses || 0);
        setTotalPieces(res.total_pieces || 0);
      }
    } catch (e: any) {
      console.error('Error loading caisses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaissesData();
  }, [bon.id]);

  // Handle scanned QR payload
  const handleProcessQr = async (qrText: string) => {
    if (isProcessingScanRef.current) return;
    isProcessingScanRef.current = true;

    try {
      const res = await api.scanCaisse(bon.id, {
        qr_payload: qrText,
        scanne_par: currentUser.full_name
      });

      if (res.success) {
        playSuccessChime();
        setCaisses(res.caisses || []);
        setLots(res.lots || []);
        setTotalCaisses(res.total_caisses || 0);
        setTotalPieces(res.total_pieces || 0);
        setLastScanned(`✓ Caisse scannée avec succès`);
        showToast('Caisse scannée et enregistrée !', 'success');
      }
    } catch (err: any) {
      playWarningBeep();
      const errMsg = err.message || 'Erreur lors du scan';
      setLastScanned(`⚠️ ${errMsg}`);
      showToast(errMsg, 'warning');
    } finally {
      setTimeout(() => {
        isProcessingScanRef.current = false;
      }, 1000); // 1-second debounce to prevent duplicate camera firing
    }
  };

  // Start Camera Scanner
  const startCamera = async () => {
    setCameraError(null);
    try {
      const qrCode = new Html5Qrcode('caisse-reader');
      html5QrCodeRef.current = qrCode;

      await qrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleProcessQr(decodedText);
        },
        () => {
          // ignore scan parse misses in frames
        }
      );
      setScanning(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError(
        'Impossible d\'accéder à la caméra. Vérifiez les autorisations de votre navigateur ou utilisez le mode simulation.'
      );
      setScanning(false);
    }
  };

  // Stop Camera Scanner
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.error('Error stopping camera:', e);
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Delete a scanned caisse
  const handleDeleteCaisse = async (caisseId: number) => {
    try {
      const res = await api.deleteCaisse(bon.id, caisseId);
      if (res.success) {
        setCaisses(res.caisses || []);
        setLots(res.lots || []);
        setTotalCaisses(res.total_caisses || 0);
        setTotalPieces(res.total_pieces || 0);
        showToast('Caisse retirée.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la suppression', 'danger');
    }
  };

  // Final Validation (Clôture Magasin)
  const handleValiderEntree = async () => {
    if (totalCaisses === 0) {
      showToast('Veuillez scanner au moins une caisse avant de valider.', 'warning');
      return;
    }

    try {
      setValidating(true);
      await api.validerEntreeCaisses(bon.id, {
        user_id: currentUser.id,
        user_nom: currentUser.full_name
      });
      showToast(`Entrée magasin validée avec succès pour le bon N° ${bon.numero_reception} !`, 'success');
      await stopCamera();
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la validation finale', 'danger');
    } finally {
      setValidating(false);
    }
  };

  const progressPercent = Math.min(100, Math.round((totalCaisses / expectedCaisses) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Header */}
        <div className="bg-[#003799] text-white p-4 sm:p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#72D54A]">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Pointage & Scan des Caisses
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#72D54A] text-[#002566]">
                  Bon N° {bon.numero_reception}
                </span>
              </div>
              <div className="text-xs text-blue-100 mt-0.5">
                Article : <strong>{articleCode}</strong> &bull; Fournisseur : <strong>{bon.fournisseur}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              title={soundEnabled ? 'Désactiver le son du scanner' : 'Activer le son du scanner'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#72D54A]" /> : <VolumeX className="w-4 h-4 text-slate-300" />}
            </button>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress & Stats Bar */}
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#003799]" />
              <span>Progression du Pointage :</span>
              <span className="text-[#003799] font-black text-sm">
                {totalCaisses} / {expectedCaisses} Caisses
              </span>
            </div>
            <div className="font-mono text-slate-600">
              {totalPieces.toLocaleString('fr-FR')} / {expectedPieces.toLocaleString('fr-FR')} pcs ({progressPercent}%)
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                progressPercent >= 100 ? 'bg-[#72D54A]' : 'bg-[#003799]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Feedback Status Alert */}
          {lastScanned && (
            <div className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-100/70 text-[#003799] border border-blue-200 animate-in fade-in">
              {lastScanned}
            </div>
          )}
        </div>

        {/* Tabs: Scanner vs Simulator */}
        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-2 transition ${
              activeTab === 'scan'
                ? 'border-[#003799] text-[#003799] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 bg-slate-50'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Caméra Smartphone / Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-2 transition ${
              activeTab === 'simulator'
                ? 'border-[#003799] text-[#003799] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Mode Test / QR Codes sur Écran</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'scan' ? (
            <div className="space-y-4">
              {/* Camera Scanner Viewport */}
              <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[260px] text-white">
                <div id="caisse-reader" className="w-full max-w-sm" />

                {!scanning && (
                  <div className="p-6 text-center space-y-3">
                    <Camera className="w-12 h-12 text-[#72D54A] mx-auto opacity-80" />
                    <p className="text-xs text-slate-300 max-w-xs">
                      Activez la caméra de votre smartphone ou tablette pour pointer chaque caisse en continu.
                    </p>
                    <button
                      onClick={startCamera}
                      className="px-6 py-2.5 bg-[#72D54A] hover:bg-[#63bd40] text-[#002566] rounded-xl font-bold text-xs shadow-lg transition active:scale-95 inline-flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Démarrer le Scanner</span>
                    </button>
                  </div>
                )}

                {scanning && (
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={stopCamera}
                      className="px-3 py-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shadow transition"
                    >
                      Arrêter Caméra
                    </button>
                  </div>
                )}

                {cameraError && (
                  <div className="p-4 bg-rose-50 text-rose-800 rounded-xl text-xs border border-rose-200 mt-2 m-4 text-center">
                    <AlertTriangle className="w-4 h-4 text-rose-600 inline mr-1" />
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Simulator Viewport for Immediate Desktop/Phone Testing */
            <div className="space-y-5">
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 text-xs text-purple-950">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-sm text-purple-900">
                  <Sparkles className="w-4 h-4 text-purple-700" />
                  <span>Comment tester immédiatement sans scanner :</span>
                </div>
                <p className="text-purple-800 leading-relaxed">
                  Vous pouvez soit <strong>cliquer sur les boutons de simulation</strong> ci-dessous, soit <strong>viser votre écran d'ordinateur avec votre smartphone</strong> pour scanner les QR codes affichés ci-dessous en direct !
                </p>
              </div>

              {/* Quick Click Simulation Buttons */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  1. Simulation en 1 Clic (Directement sur PC) :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleProcessQr(`${articleCode};LOT-2026-A42;504;CS-${Date.now().toString().slice(-4)}`)}
                    className="p-3 bg-white border border-slate-300 hover:border-[#003799] hover:bg-blue-50/50 rounded-xl text-left transition shadow-xs group"
                  >
                    <div className="font-bold text-xs text-[#003799] group-hover:underline">
                      + Scanner Caisse (Lot A42)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Lot: LOT-2026-A42 &bull; 504 pcs
                    </div>
                  </button>

                  <button
                    onClick={() => handleProcessQr(`${articleCode};LOT-2026-A42;504;CS-${Date.now().toString().slice(-4)}`)}
                    className="p-3 bg-white border border-slate-300 hover:border-[#003799] hover:bg-blue-50/50 rounded-xl text-left transition shadow-xs group"
                  >
                    <div className="font-bold text-xs text-[#003799] group-hover:underline">
                      + Scanner Caisse Suivante (Lot A42)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Lot: LOT-2026-A42 &bull; 504 pcs
                    </div>
                  </button>

                  <button
                    onClick={() => handleProcessQr(`${articleCode};LOT-2026-B10;504;CS-${Date.now().toString().slice(-4)}`)}
                    className="p-3 bg-white border border-slate-300 hover:border-purple-600 hover:bg-purple-50/50 rounded-xl text-left transition shadow-xs group"
                  >
                    <div className="font-bold text-xs text-purple-700 group-hover:underline">
                      + Scanner Caisse (Second Lot B10)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Lot: LOT-2026-B10 &bull; 504 pcs
                    </div>
                  </button>
                </div>
              </div>

              {/* On-Screen QR Code images to scan with real Phone camera */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  2. QR Codes Réels à Scanner avec votre Téléphone :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col items-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${articleCode};LOT-2026-A42;504;CS-01`)}`}
                      alt="QR Caisse 1"
                      className="w-28 h-28 object-contain rounded border border-slate-100"
                    />
                    <div className="text-[11px] font-bold text-slate-800 mt-2">Caisse #01</div>
                    <div className="text-[10px] text-slate-500 font-mono">Lot A42 (504 pcs)</div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col items-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${articleCode};LOT-2026-A42;504;CS-02`)}`}
                      alt="QR Caisse 2"
                      className="w-28 h-28 object-contain rounded border border-slate-100"
                    />
                    <div className="text-[11px] font-bold text-slate-800 mt-2">Caisse #02</div>
                    <div className="text-[10px] text-slate-500 font-mono">Lot A42 (504 pcs)</div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col items-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${articleCode};LOT-2026-B10;504;CS-03`)}`}
                      alt="QR Caisse 3"
                      className="w-28 h-28 object-contain rounded border border-slate-100"
                    />
                    <div className="text-[11px] font-bold text-purple-700 mt-2">Caisse #03</div>
                    <div className="text-[10px] text-slate-500 font-mono">Lot B10 (504 pcs)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grouped Lots Breakdown Cards */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#72D54A]" />
              <span>Répartition par Lot Fournisseur ({lots.length} lot{lots.length > 1 ? 's' : ''}) :</span>
            </h4>

            {lots.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                Aucune caisse scannée pour le moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lots.map((l) => (
                  <div
                    key={l.lot}
                    className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                        N° de Lot Fournisseur
                      </div>
                      <div className="text-sm font-black font-mono text-emerald-950 mt-0.5">
                        {l.lot}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-emerald-900">
                        {l.nombre_caisses} Caisse{l.nombre_caisses > 1 ? 's' : ''}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-mono">
                        {l.quantite_totale.toLocaleString('fr-FR')} pcs
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scanned Caisses Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Détail des Caisses Enregistrées ({caisses.length})
              </h4>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10.5px]">
                  <tr>
                    <th className="py-2 px-3"># Caisse</th>
                    <th className="py-2 px-3">Lot Fournisseur</th>
                    <th className="py-2 px-3 text-right">Quantité</th>
                    <th className="py-2 px-3">Heure Scan</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {caisses.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 font-bold text-[#003799]">
                        {c.code_caisse}
                      </td>
                      <td className="py-1.5 px-3 font-semibold text-slate-800">
                        {c.numero_lot_fournisseur}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-800">
                        {c.quantite} pcs
                      </td>
                      <td className="py-1.5 px-3 text-slate-500 text-[11px]">
                        {c.date_scan ? new Date(c.date_scan).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <button
                          onClick={() => handleDeleteCaisse(c.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Supprimer cette caisse"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions (No location / rack step!) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Total pointé : <strong className="text-slate-800">{totalCaisses} caisses</strong> ({totalPieces.toLocaleString('fr-FR')} pièces)
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition w-full sm:w-auto"
            >
              Fermer
            </button>

            <button
              onClick={handleValiderEntree}
              disabled={validating || totalCaisses === 0}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 w-full sm:w-auto ${
                totalCaisses > 0
                  ? 'bg-[#003799] hover:bg-[#002566] text-white active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4 text-[#72D54A]" />
              <span>{validating ? 'Validation en cours...' : 'Valider Entrée Magasin'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
