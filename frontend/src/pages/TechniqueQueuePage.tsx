import React from 'react';
import { BonReception } from '../types';
import { Microscope, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface TechniqueQueuePageProps {
  queue: BonReception[];
  onOpenTechniqueModal: (bon: BonReception) => void;
  onRowClick: (bon: BonReception) => void;
}

export const TechniqueQueuePage: React.FC<TechniqueQueuePageProps> = ({
  queue,
  onOpenTechniqueModal,
  onRowClick
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-amber-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
            <Microscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-amber-950">
              File d'Attente : Contrôle Technique
            </h2>
            <p className="text-[11px] text-amber-800">
              Bons de réception en attente de vérification qualité et conformité technique.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-900 border border-amber-300">
          {queue.length} bon(s) en attente
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
              <th className="py-2.5 px-3.5 w-32">N° Réception</th>
              <th className="py-2.5 px-3.5 w-28">Date Arrivage</th>
              <th className="py-2.5 px-3.5 w-36">Fournisseur</th>
              <th className="py-2.5 px-3.5">Articles & Quantités Attendues</th>
              <th className="py-2.5 px-3.5">Remarques Appro</th>
              <th className="py-2.5 px-3.5 w-32 text-center">Statut</th>
              <th className="py-2.5 px-3.5 w-32 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {queue.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-emerald-700 font-medium">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  Aucun bon en attente de contrôle technique. File d'attente à jour !
                </td>
              </tr>
            ) : (
              queue.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => onRowClick(b)}
                  className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3.5 font-bold font-mono text-[#003799]">{b.numero_reception}</td>
                  <td className="py-3 px-3.5 text-slate-600">
                    {b.date_reception ? new Date(b.date_reception).toLocaleDateString('fr-FR') : '--'}
                  </td>
                  <td className="py-3 px-3.5 font-semibold text-slate-800">{b.fournisseur}</td>
                  <td className="py-3 px-3.5">
                    {(b.sample_items || []).map((it, idx) => (
                      <span key={idx} className="inline-block bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 mr-1 mb-1 text-[11px] font-mono">
                        <strong className="text-[#003799]">{it.code_article}</strong> {it.designation_article} ({Number(it.quantite_attendue).toLocaleString('fr-FR')} {it.unite_mesure})
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-3.5 text-slate-600 truncate max-w-xs">{b.remarques_appro || '--'}</td>
                  <td className="py-3 px-3.5 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      En attente
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenTechniqueModal(b)}
                      className="px-3 py-1.5 bg-[#003799] hover:bg-[#002566] text-white rounded-lg font-bold text-xs shadow-sm flex items-center gap-1.5 ml-auto transition-all active:scale-95"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#72D54A]" />
                      <span>Contrôler</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
