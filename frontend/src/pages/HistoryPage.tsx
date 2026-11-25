import React from 'react';
import { BonReception } from '../types';
import { History, Clock, FileText } from 'lucide-react';

interface HistoryPageProps {
  receptions: BonReception[];
  onRowClick: (bon: BonReception) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ receptions, onRowClick }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#003799]" />
          <h2 className="text-sm font-bold text-slate-800">
            Journal Global d'Audit & Traçabilité des Réceptions
          </h2>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {receptions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Aucune activité enregistrée pour le moment.
            </div>
          ) : (
            receptions.map((b) => (
              <div
                key={b.id}
                onClick={() => onRowClick(b)}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 cursor-pointer transition-all flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#003799] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    REC
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#003799]">
                        Bon N° {b.numero_reception}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Fournisseur : <strong>{b.fournisseur}</strong>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                        {b.statut}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mt-1">
                      {b.remarques_appro ? `Appro : "${b.remarques_appro}"` : 'Créé par le Service Approvisionnement'}
                    </div>

                    {b.remarques_technique && (
                      <div className="text-xs text-amber-800 mt-1 bg-amber-50/80 px-2.5 py-1 rounded border border-amber-200/50">
                        🔬 Contrôle Technique ({b.decision_technique}) : {b.remarques_technique}
                      </div>
                    )}

                    {b.remarques_magasin && (
                      <div className="text-xs text-purple-800 mt-1 bg-purple-50/80 px-2.5 py-1 rounded border border-purple-200/50">
                        🏬 Magasin ({b.decision_magasin}) : {b.remarques_magasin}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                  <div>{b.date_creation ? new Date(b.date_creation).toLocaleDateString('fr-FR') : '--'}</div>
                  <div className="font-semibold text-slate-600 mt-1">
                    {b.total_lignes || 0} article(s)
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

