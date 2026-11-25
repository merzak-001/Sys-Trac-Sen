import React, { useState } from 'react';
import { BonReception, User } from '../types';
import { X, Warehouse, CheckCircle2, AlertTriangle, Send } from 'lucide-react';

interface MagasinModalProps {
  bon: BonReception | null;
  currentUser: User;
  onClose: () => void;
  onSubmit: (bonId: number, data: any) => Promise<void>;
}

export const MagasinModal: React.FC<MagasinModalProps> = ({
  bon,
  currentUser,
  onClose,
  onSubmit
}) => {
  if (!bon) return null;

  const [remarques, setRemarques] = useState('');
  const [lignes, setLignes] = useState(
    (bon.lignes || []).map((l) => ({
      id: l.id,
      ligne_numero: l.ligne_numero,
      code_article: l.code_article,
      designation_article: l.designation_article,
      quantite_attendue: l.quantite_attendue,
      quantite_recue_magasin: l.quantite_recue_magasin != null ? l.quantite_recue_magasin : l.quantite_attendue,
      unite_mesure: l.unite_mesure,
      emplacement: (l as any).emplacement || 'Zone Magasin',
      nombre_palettes: (l as any).nombre_palettes || 1,
      remarques_magasin: l.remarques_magasin || ''
    }))
  );
  const [submitting, setSubmitting] = useState(false);

  const handleQtyChange = (idx: number, val: number) => {
    const updated = [...lignes];
    updated[idx].quantite_recue_magasin = val;
    setLignes(updated);
  };

  const handleRemChange = (idx: number, val: string) => {
    const updated = [...lignes];
    updated[idx].remarques_magasin = val;
    setLignes(updated);
  };

  const handleEmplacementChange = (idx: number, val: string) => {
    const updated = [...lignes];
    updated[idx].emplacement = val;
    setLignes(updated);
  };

  const handleNbPalettesChange = (idx: number, val: number) => {
    const updated = [...lignes];
    updated[idx].nombre_palettes = Math.max(1, Math.floor(val) || 1);
    setLignes(updated);
  };

  // Check if any discrepancies exist
  const hasDiscrepancy = lignes.some(
    (l) => Math.abs((Number(l.quantite_recue_magasin) || 0) - Number(l.quantite_attendue)) > 0.001
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(bon.id, {
        decision: hasDiscrepancy ? 'AVEC_ECART' : 'CONFORME',
        remarques_magasin: remarques,
        remarques: remarques,
        user_id: currentUser.id,
        user_nom: currentUser.full_name,
        lignes
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
        <div className="p-5 border-b border-slate-200 bg-purple-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-purple-950">
                Contrôle Quantité Magasin & Clôture — Bon N° {bon.numero_reception}
              </h2>
              <div className="text-xs text-purple-800 mt-0.5">
                Fournisseur : <strong>{bon.fournisseur}</strong> &bull; Avis Contrôle Tech : <strong>{bon.decision_technique || 'CONFORME'}</strong>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${hasDiscrepancy
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}>
            {hasDiscrepancy ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <div>
              {hasDiscrepancy ? (
                <span>
                  <strong>Attention :</strong> Des écarts ont été détectés entre les quantités attendues et les quantités comptées. Le bon sera clôturé avec la mention <strong>« AVEC ÉCART »</strong>.
                </span>
              ) : (
                <span>
                  Toutes les quantités comptées sont conformes aux prévisions du bon de livraison. Le bon sera clôturé <strong>« CONFORME »</strong>.
                </span>
              )}
            </div>
          </div>

          {/* Table Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Comptage Physique des Articles ({lignes.length})
              </label>
              <span className="text-[11px] text-slate-500">
                Indiquez les quantités physiques réellement mises en stock.
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-28">Code</th>
                    <th className="py-2.5 px-3">Désignation</th>
                    <th className="py-2.5 px-3 text-right w-24">Qté Attendue</th>
                    <th className="py-2.5 px-3 text-right w-28 bg-purple-100/60 text-purple-900">Qté Reçue</th>
                    <th className="py-2.5 px-3 text-center w-20">Écart</th>
                    <th className="py-2.5 px-3 w-20 text-center">Nbre Pal.</th>
                    <th className="py-2.5 px-3 w-32">Emplacement</th>
                    <th className="py-2.5 px-3">Remarques</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lignes.map((l, idx) => {
                    const attendu = Number(l.quantite_attendue) || 0;
                    const recu = Number(l.quantite_recue_magasin) || 0;
                    const ecart = recu - attendu;

                    return (
                      <tr key={l.id || idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">{l.ligne_numero}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#003799]">{l.code_article}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{l.designation_article}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-600">
                          {attendu.toLocaleString('fr-FR')} {l.unite_mesure}
                        </td>
                        <td className="py-2.5 px-3 text-right bg-purple-50/40">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={l.quantite_recue_magasin}
                            onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-full text-right border-2 border-purple-300 rounded py-1 px-2 font-mono font-bold text-purple-950 focus:border-[#003799]"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {Math.abs(ecart) < 0.001 ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              0 (OK)
                            </span>
                          ) : ecart > 0 ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                              +{ecart.toLocaleString('fr-FR')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                              {ecart.toLocaleString('fr-FR')}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={l.nombre_palettes}
                            onChange={(e) => handleNbPalettesChange(idx, parseInt(e.target.value, 10) || 1)}
                            className="w-16 text-center border border-slate-300 rounded py-1 px-1 font-bold text-slate-800 focus:border-[#003799]"
                            title="Nombre de palettes / colis à générer"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Ex: Rack A-01"
                            value={l.emplacement}
                            onChange={(e) => handleEmplacementChange(idx, e.target.value)}
                            className="w-full border border-slate-300 rounded py-1 px-2 text-xs focus:border-[#003799]"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Remarques..."
                            value={l.remarques_magasin}
                            onChange={(e) => handleRemChange(idx, e.target.value)}
                            className="w-full border border-slate-300 rounded py-1 px-2 text-xs focus:border-[#003799]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observations Magasin */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Remarques Générales Magasin / Stockage
            </label>
            <textarea
              rows={3}
              value={remarques}
              onChange={(e) => setRemarques(e.target.value)}
              placeholder="Précisez l'état du conditionnement, palettes, saisie SAP MIGO / entrée en stock effectuée..."
              className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#003799]/20 focus:border-[#003799]"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#003799] hover:bg-[#002566] text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4 text-[#72D54A]" />
              <span>{submitting ? 'Clôture en cours...' : 'Valider le Stockage & Clôturer le Bon'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
