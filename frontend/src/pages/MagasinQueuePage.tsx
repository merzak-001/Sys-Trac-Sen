import React from 'react';
import { BonReception } from '../types';
import { Warehouse, CheckCircle2, QrCode } from 'lucide-react';

interface MagasinQueuePageProps {
  queue: BonReception[];
  onOpenMagasinModal: (bon: BonReception) => void;
  onOpenScannerModal?: (bon: BonReception) => void;
  onRowClick: (bon: BonReception) => void;
}

export const MagasinQueuePage: React.FC<MagasinQueuePageProps> = ({
  queue,
  onOpenMagasinModal,
  onOpenScannerModal,
  onRowClick
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-purple-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-purple-950">
              File d'Attente : Magasin & Stockage
            </h2>
            <p className="text-[11px] text-purple-800">
              Bons validés techniquement en attente de vérification quantitative et clôture d’entrée en stock.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-200 text-purple-900 border border-purple-300">
          {queue.length} bon(s) prêt(s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
              <th className="py-2.5 px-3.5 w-32">N° Réception</th>
              <th className="py-2.5 px-3.5 w-28">Date Arrivage</th>
              <th className="py-2.5 px-3.5 w-36">Fournisseur</th>
              <th className="py-2.5 px-3.5">Articles & Quantités</th>
              <th className="py-2.5 px-3.5 w-32 text-center">Avis Technique</th>
              <th className="py-2.5 px-3.5 w-28 text-center">Délai Tech</th>
              <th className="py-2.5 px-3.5 w-32 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {queue.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-emerald-700 font-medium">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  Aucun bon en attente de réception magasin. Tout le stock est à jour !
                </td>
              </tr>
            ) : (
              queue.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => onRowClick(b)}
                  className="hover:bg-purple-50/40 cursor-pointer transition-colors"
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
                  <td className="py-3 px-3.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {b.decision_technique || 'CONFORME'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-center font-bold text-slate-600">
                    {b.duree_jours_technique != null ? `${b.duree_jours_technique} j` : '--'}
                  </td>
                  <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {onOpenScannerModal && (
                        <button
                          onClick={() => onOpenScannerModal(b)}
                          className="px-3 py-1.5 bg-[#003799] hover:bg-[#002566] text-white rounded-lg font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                          title="Ouvrir le scanner caméra pour pointer les caisses par QR code"
                        >
                          <QrCode className="w-3.5 h-3.5 text-[#72D54A]" />
                          <span>Scanner Caisses</span>
                        </button>
                      )}
                      <button
                        onClick={() => onOpenMagasinModal(b)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs border border-slate-200 flex items-center gap-1 transition-all"
                        title="Vérification manuelle sans scanner"
                      >
                        <Warehouse className="w-3 h-3 text-slate-500" />
                        <span>Saisie</span>
                      </button>
                    </div>
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
