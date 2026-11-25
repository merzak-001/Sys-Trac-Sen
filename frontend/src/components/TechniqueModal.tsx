import React, { useState } from 'react';
import { BonReception, User } from '../types';
import { X, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Send } from 'lucide-react';

interface TechniqueModalProps {
  bon: BonReception | null;
  currentUser: User;
  onClose: () => void;
  onSubmit: (bonId: number, data: any) => Promise<void>;
}

export const TechniqueModal: React.FC<TechniqueModalProps> = ({
  bon,
  currentUser,
  onClose,
  onSubmit
}) => {
  if (!bon) return null;

  const [decisionGlobale, setDecisionGlobale] = useState<'CONFORME' | 'NON_CONFORME' | 'AVEC_RESERVE'>('CONFORME');
  const [remarques, setRemarques] = useState('');
  const [lignes, setLignes] = useState(
    (bon.lignes || []).map((l) => ({
      id: l.id,
      ligne_numero: l.ligne_numero,
      code_article: l.code_article,
      designation_article: l.designation_article,
      quantite_attendue: l.quantite_attendue,
      unite_mesure: l.unite_mesure,
      statut_technique: l.statut_technique && l.statut_technique !== 'EN_ATTENTE' ? l.statut_technique : 'CONFORME',
      remarques_technique: l.remarques_technique || '',
      defauts_trouves: l.defauts_trouves || 0
    }))
  );
  const [submitting, setSubmitting] = useState(false);

  const handleLigneChange = (idx: number, field: string, val: any) => {
    const updated = [...lignes];
    (updated[idx] as any)[field] = val;
    setLignes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(bon.id, {
        decision_globale: decisionGlobale,
        decision: decisionGlobale,
        remarques_technique: remarques,
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
        <div className="p-5 border-b border-slate-200 bg-amber-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-amber-950">
                Formulaire Contrôle Technique — Bon N° {bon.numero_reception}
              </h2>
              <div className="text-xs text-amber-800 mt-0.5">
                Fournisseur : <strong>{bon.fournisseur}</strong> &bull; Arrivage : <strong>{new Date(bon.date_reception).toLocaleDateString('fr-FR')}</strong>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Decision Globale */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Décision Globale de Contrôle Technique *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`p-3.5 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs font-bold transition-all ${decisionGlobale === 'CONFORME'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}>
                <input
                  type="radio"
                  name="decision"
                  value="CONFORME"
                  checked={decisionGlobale === 'CONFORME'}
                  onChange={() => setDecisionGlobale('CONFORME')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>CONFORME</span>
              </label>

              <label className={`p-3.5 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs font-bold transition-all ${decisionGlobale === 'AVEC_RESERVE'
                ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}>
                <input
                  type="radio"
                  name="decision"
                  value="AVEC_RESERVE"
                  checked={decisionGlobale === 'AVEC_RESERVE'}
                  onChange={() => setDecisionGlobale('AVEC_RESERVE')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>AVEC RÉSERVE</span>
              </label>

              <label className={`p-3.5 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs font-bold transition-all ${decisionGlobale === 'NON_CONFORME'
                ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}>
                <input
                  type="radio"
                  name="decision"
                  value="NON_CONFORME"
                  checked={decisionGlobale === 'NON_CONFORME'}
                  onChange={() => setDecisionGlobale('NON_CONFORME')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>NON CONFORME</span>
              </label>
            </div>
          </div>

          {/* Line by line inspection table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Contrôle par Article ({lignes.length})
              </label>
              <span className="text-[11px] text-slate-500">
                Spécifiez l’état de chaque article et relevez les défauts constatés.
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-28">Code</th>
                    <th className="py-2.5 px-3">Désignation</th>
                    <th className="py-2.5 px-3 text-right w-24">Qté</th>
                    <th className="py-2.5 px-3 w-36">Avis Technique</th>
                    <th className="py-2.5 px-3 w-24 text-center">Défauts</th>
                    <th className="py-2.5 px-3">Remarques / Anomalies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lignes.map((l, idx) => (
                    <tr key={l.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">{l.ligne_numero}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#003799]">{l.code_article}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{l.designation_article}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                        {Number(l.quantite_attendue).toLocaleString('fr-FR')} {l.unite_mesure}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={l.statut_technique}
                          onChange={(e) => handleLigneChange(idx, 'statut_technique', e.target.value)}
                          className={`w-full py-1 px-2 rounded border text-xs font-semibold ${l.statut_technique === 'CONFORME'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : l.statut_technique === 'NON_CONFORME'
                              ? 'border-rose-300 bg-rose-50 text-rose-800'
                              : 'border-amber-300 bg-amber-50 text-amber-800'
                            }`}
                        >
                          <option value="CONFORME">Conforme</option>
                          <option value="RESERVE">Avec Réserve</option>
                          <option value="NON_CONFORME">Non Conforme</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={l.defauts_trouves}
                          onChange={(e) => handleLigneChange(idx, 'defauts_trouves', parseInt(e.target.value, 10) || 0)}
                          className="w-16 text-center border border-slate-300 rounded py-1 px-1.5 font-bold focus:border-[#003799]"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          placeholder="Observations pièce..."
                          value={l.remarques_technique}
                          onChange={(e) => handleLigneChange(idx, 'remarques_technique', e.target.value)}
                          className="w-full border border-slate-300 rounded py-1 px-2 text-xs focus:border-[#003799]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observations Générales */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Rapport d'expertise / Remarques générales du Contrôle Technique
            </label>
            <textarea
              rows={3}
              value={remarques}
              onChange={(e) => setRemarques(e.target.value)}
              placeholder="Indiquez les résultats des tests dimensionnels, aspects matière, certificats matière reçus ou non conformités constatées..."
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
              <span>{submitting ? 'Validation...' : 'Valider & Enregistrer le Contrôle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
