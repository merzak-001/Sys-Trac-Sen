import React from 'react';
import { BonReception, User } from '../types';
import { 
  Search, 
  Download, 
  Eye, 
  Edit2,
  Plus,
  Package,
  ShieldCheck,
  Warehouse
} from 'lucide-react';

interface ReceptionsPageProps {
  receptions: BonReception[];
  currentUser: User;
  suppliers: string[];
  currentFilterTab: string;
  onFilterTabChange: (tab: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  supplierFilter: string;
  onSupplierFilterChange: (val: string) => void;
  onExportExcel: () => void;
  onRowClick: (bon: BonReception) => void;
  onOpenTechniqueModal: (bon: BonReception) => void;
  onOpenMagasinModal: (bon: BonReception) => void;
  onEditReception?: (bon: BonReception) => void;
  onOpenCreateModal?: () => void;
}

export const ReceptionsPage: React.FC<ReceptionsPageProps> = ({
  receptions,
  currentUser,
  suppliers,
  currentFilterTab,
  onFilterTabChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  supplierFilter,
  onSupplierFilterChange,
  onExportExcel,
  onRowClick,
  onOpenTechniqueModal,
  onOpenMagasinModal,
  onEditReception,
  onOpenCreateModal
}) => {
  const role = currentUser.role;

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE_TECHNIQUE':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
            Attente Contrôle Tech
          </span>
        );
      case 'EN_COURS_TECHNIQUE':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-900 border border-blue-200">
            En cours Contrôle Tech
          </span>
        );
      case 'VALIDE_TECHNIQUE':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-900 border border-sky-200">
            Attente Magasin
          </span>
        );
      case 'VALIDE_MAGASIN':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
            Validé (Clôturé)
          </span>
        );
      case 'NON_CONFORME':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-900 border border-rose-200">
            Non Conforme
          </span>
        );
      case 'ECART_MAGASIN':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
            Clôturé avec Écart
          </span>
        );
      default:
        return <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">{statut}</span>;
    }
  };

  const getDecisionBadge = (decision?: string) => {
    if (!decision) return <span className="text-slate-300 italic">--</span>;
    if (decision === 'CONFORME') {
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Conforme</span>;
    }
    if (decision === 'NON_CONFORME' || decision === 'REFUSE') {
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">{decision === 'REFUSE' ? 'Refusé' : 'Non Conforme'}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">{decision}</span>;
  };

  const pendingTabLabel = {
    technique: 'À contrôler (Technique)',
    magasin: 'À vérifier (Magasin)',
    appro: 'Mes réceptions en cours',
    admin: 'En attente d’action'
  }[role] || 'En attente';

  return (
    <div className="space-y-4">
      {/* Quick Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => onFilterTabChange('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            currentFilterTab === 'all'
              ? 'bg-[#003799] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Tous les bons</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${currentFilterTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {receptions.length}
          </span>
        </button>

        <button
          onClick={() => onFilterTabChange('pending_me')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            currentFilterTab === 'pending_me'
              ? 'bg-[#003799] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>{pendingTabLabel}</span>
        </button>

        <button
          onClick={() => onFilterTabChange('completed')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            currentFilterTab === 'completed'
              ? 'bg-[#003799] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Validés & Clôturés</span>
        </button>

        <button
          onClick={() => onFilterTabChange('issues')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            currentFilterTab === 'issues'
              ? 'bg-[#003799] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Anomalies & Écarts</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <span>Bons de Réception</span>
            <span className="text-[11px] font-normal text-slate-500">
              (Sélectionnez un bon pour afficher ses détails complets et son historique)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="N° Bon, Fournisseur, Article..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-60 focus:outline-none focus:border-[#003799]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#003799]"
            >
              <option value="TOUS">Tous les statuts</option>
              <option value="EN_ATTENTE_TECHNIQUE">En attente Contrôle Tech</option>
              <option value="VALIDE_TECHNIQUE">En attente Magasin</option>
              <option value="VALIDE_MAGASIN">Validé Magasin (Clôturé)</option>
              <option value="NON_CONFORME">Non Conforme</option>
              <option value="ECART_MAGASIN">Clôturé avec Écart</option>
            </select>

            {/* Supplier Filter */}
            <select
              value={supplierFilter}
              onChange={(e) => onSupplierFilterChange(e.target.value)}
              className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#003799]"
            >
              <option value="TOUS">Tous les fournisseurs</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Export Excel */}
            <button
              onClick={onExportExcel}
              className="py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5 text-[#003799]" />
              <span>Excel</span>
            </button>

            {/* Create Bon Button */}
            {onOpenCreateModal && (role === 'appro' || role === 'admin') && (
              <button
                onClick={onOpenCreateModal}
                className="py-1.5 px-3.5 bg-[#003799] hover:bg-[#002b77] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouveau Bon</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5">N° Bon</th>
                <th className="py-3 px-3.5">Arrivage & Créé par</th>
                <th className="py-3 px-3.5">Fournisseur</th>
                <th className="py-3 px-3.5">Articles</th>
                <th className="py-3 px-3.5 text-center">Statut Cycle</th>

                {/* Role Specific Columns */}
                {(role === 'appro' || role === 'admin') && (
                  <th className="py-3 px-3.5 text-right">Qté Attendue</th>
                )}

                {(role === 'technique' || role === 'admin') && (
                  <>
                    <th className="py-3 px-3.5 text-center">Avis Tech</th>
                    <th className="py-3 px-3.5 text-center">Défauts</th>
                  </>
                )}

                {(role === 'magasin' || role === 'admin') && (
                  <>
                    <th className="py-3 px-3.5 text-right">Qté Magasin</th>
                    <th className="py-3 px-3.5 text-center">Avis Magasin</th>
                  </>
                )}

                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receptions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Aucun bon de réception trouvé pour ces critères.
                  </td>
                </tr>
              ) : (
                receptions.map((bon) => {
                  const canActionTech = (role === 'technique' || role === 'admin') && (bon.statut === 'EN_ATTENTE_TECHNIQUE' || bon.statut === 'EN_COURS_TECHNIQUE');
                  const canActionMag = (role === 'magasin' || role === 'admin') && bon.statut === 'VALIDE_TECHNIQUE';

                  return (
                    <tr
                      key={bon.id}
                      onClick={() => onRowClick(bon)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      {/* N° Bon */}
                      <td className="py-3 px-3.5 font-mono font-bold text-[#003799]">
                        {bon.numero_reception}
                      </td>

                      {/* Date & Creator */}
                      <td className="py-3 px-3.5 text-slate-600">
                        <div className="font-semibold text-slate-800">
                          {bon.date_reception ? new Date(bon.date_reception).toLocaleDateString('fr-FR') : '--'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {bon.cree_par_nom || 'Service Appro'}
                        </div>
                      </td>

                      {/* Fournisseur */}
                      <td className="py-3 px-3.5 font-semibold text-slate-900">
                        {bon.fournisseur}
                      </td>

                      {/* Articles summary */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#003799] bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                            {bon.total_lignes || 0} art.
                          </span>
                        </div>
                        {bon.sample_items && bon.sample_items.length > 0 && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                            {bon.sample_items.map((s) => s.code_article).join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center">
                        {getStatusBadge(bon.statut)}
                      </td>

                      {/* Role Specific: Appro */}
                      {(role === 'appro' || role === 'admin') && (
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-800">
                          {(bon.quantite_totale || 0).toLocaleString('fr-FR')}
                        </td>
                      )}

                      {/* Role Specific: Technique */}
                      {(role === 'technique' || role === 'admin') && (
                        <>
                          <td className="py-3 px-3.5 text-center">
                            {getDecisionBadge(bon.decision_technique)}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              bon.total_defauts && bon.total_defauts > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {bon.total_defauts || 0}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Role Specific: Magasin */}
                      {(role === 'magasin' || role === 'admin') && (
                        <>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-800">
                            {bon.quantite_magasin_totale != null
                              ? (bon.quantite_magasin_totale || 0).toLocaleString('fr-FR')
                              : <span className="text-slate-300">--</span>}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {getDecisionBadge(bon.decision_magasin)}
                          </td>
                        </>
                      )}

                      {/* Action buttons */}
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {canActionTech && (
                            <button
                              onClick={() => onOpenTechniqueModal(bon)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-sm transition active:scale-95"
                              title="Effectuer le Contrôle Technique"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Contrôler</span>
                            </button>
                          )}

                          {canActionMag && (
                            <button
                              onClick={() => onOpenMagasinModal(bon)}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-sm transition active:scale-95"
                              title="Valider la réception Magasin"
                            >
                              <Warehouse className="w-3.5 h-3.5" />
                              <span>Réceptionner</span>
                            </button>
                          )}

                          {onEditReception && (
                            <button
                              onClick={() => onEditReception(bon)}
                              className="p-1.5 text-slate-400 hover:text-[#003799] hover:bg-blue-50 rounded-lg transition"
                              title="Modifier ce bon de réception"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onRowClick(bon)}
                            className="p-1.5 text-slate-400 hover:text-[#003799] hover:bg-blue-50 rounded-lg transition"
                            title="Voir les détails complets"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
