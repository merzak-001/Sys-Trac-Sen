import React, { useState, useEffect } from 'react';
import { BonReception, User, PaletteItem, CaisseItem, LotSummaryItem } from '../types';
import { api } from '../services/api';
import { 
  X, 
  Calendar, 
  User as UserIcon, 
  Building2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Warehouse, 
  PackageCheck,
  History,
  ArrowRight,
  XCircle,
  Edit2,
  Boxes,
  QrCode
} from 'lucide-react';

interface DetailModalProps {
  bon: BonReception | null;
  currentUser: User;
  onClose: () => void;
  onOpenTechniqueModal: (bon: BonReception) => void;
  onOpenMagasinModal: (bon: BonReception) => void;
  onOpenScannerModal?: (bon: BonReception) => void;
  onEditReception?: (bon: BonReception) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  bon,
  currentUser,
  onClose,
  onOpenTechniqueModal,
  onOpenMagasinModal,
  onOpenScannerModal,
  onEditReception
}) => {
  if (!bon) return null;

  const role = currentUser.role;

  const [palettes, setPalettes] = useState<PaletteItem[]>([]);
  const [caisses, setCaisses] = useState<CaisseItem[]>([]);
  const [lots, setLots] = useState<LotSummaryItem[]>([]);

  useEffect(() => {
    if (bon?.id) {
      api.getPalettesByReception(bon.id)
        .then((res) => {
          if (res.success) setPalettes(res.palettes || []);
        })
        .catch(() => setPalettes([]));

      api.getCaissesByReception(bon.id)
        .then((res) => {
          if (res.success) {
            setCaisses(res.caisses || []);
            setLots(res.lots || []);
          }
        })
        .catch(() => {});
    }
  }, [bon?.id]);

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE_TECHNIQUE':
        return <span className="px-3 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">En attente Contrôle Tech</span>;
      case 'EN_COURS_TECHNIQUE':
        return <span className="px-3 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200">En cours Contrôle Tech</span>;
      case 'VALIDE_TECHNIQUE':
        return <span className="px-3 py-1 rounded text-xs font-semibold bg-sky-50 text-sky-900 border border-sky-200">En attente Magasin</span>;
      case 'VALIDE_MAGASIN':
        return <span className="px-3 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">Validé Magasin (Clôturé)</span>;
      case 'NON_CONFORME':
        return <span className="px-3 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-900 border border-rose-200">Non Conforme</span>;
      case 'ECART_MAGASIN':
        return <span className="px-3 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">Clôturé avec Écart</span>;
      default:
        return <span className="px-3 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700">{statut}</span>;
    }
  };

  const isStep1Done = true; // Appro is done when created
  const isStep2Done = bon.date_validation_technique != null;
  const isStep3Done = bon.date_validation_magasin != null;

  const canActionTechnique = (role === 'technique' || role === 'admin') && (bon.statut === 'EN_ATTENTE_TECHNIQUE' || bon.statut === 'EN_COURS_TECHNIQUE');
  const canActionMagasin = (role === 'magasin' || role === 'admin') && bon.statut === 'VALIDE_TECHNIQUE';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-extrabold text-[#003799]">
                Bon de Réception N° {bon.numero_reception}
              </span>
              {getStatusBadge(bon.statut)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Fournisseur : <strong className="text-slate-800">{bon.fournisseur}</strong>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date Arrivage : <strong className="text-slate-800">{bon.date_reception ? new Date(bon.date_reception).toLocaleDateString('fr-FR') : '--'}</strong>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                Créé par : <strong className="text-slate-800">{bon.cree_par_nom || 'Service Approvisionnement'}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditReception && (
              <button
                onClick={() => {
                  onClose();
                  onEditReception(bon);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 border border-slate-300"
                title="Modifier les informations de ce bon"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#003799]" />
                Modifier
              </button>
            )}

            {canActionTechnique && (
              <button
                onClick={() => {
                  onClose();
                  onOpenTechniqueModal(bon);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                Effectuer Contrôle Technique
              </button>
            )}

            {canActionMagasin && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMagasinModal(bon);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95"
              >
                <Warehouse className="w-4 h-4" />
                Effectuer Réception Magasin
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Visual 3-Step Lifecycle Timeline */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">
              Cycle de Traçabilité (Appro ➔ Contrôle Technique ➔ Magasin)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1: Appro */}
              <div className={`p-4 rounded-xl border bg-white ${
                isStep1Done ? 'border-emerald-300 shadow-sm' : 'border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    1. Approvisionnement
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {bon.date_creation ? new Date(bon.date_creation).toLocaleDateString('fr-FR') : '--'}
                  </span>
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <div>Agent : <strong>{bon.cree_par_nom || 'Appro'}</strong></div>
                  <div>Articles attendus : <strong>{bon.lignes?.length || 0} ligne(s)</strong></div>
                  {bon.remarques_appro && (
                    <div className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                      « {bon.remarques_appro} »
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Contrôle Technique */}
              <div className={`p-4 rounded-xl border bg-white ${
                isStep2Done
                  ? bon.decision_technique === 'NON_CONFORME'
                    ? 'border-rose-300 shadow-sm'
                    : 'border-emerald-300 shadow-sm'
                  : bon.statut === 'EN_ATTENTE_TECHNIQUE' || bon.statut === 'EN_COURS_TECHNIQUE'
                  ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-sm'
                  : 'border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    isStep2Done
                      ? bon.decision_technique === 'NON_CONFORME' ? 'text-rose-800' : 'text-emerald-800'
                      : 'text-amber-800'
                  }`}>
                    {isStep2Done ? (
                      bon.decision_technique === 'NON_CONFORME' ? (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600" />
                    )}
                    2. Contrôle Technique
                  </span>
                  {bon.duree_jours_technique != null && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                      {bon.duree_jours_technique} j
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <div>
                    Avis : {bon.decision_technique ? (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        bon.decision_technique === 'CONFORME'
                          ? 'bg-emerald-100 text-emerald-800'
                          : bon.decision_technique === 'NON_CONFORME'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {bon.decision_technique}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold italic">En attente d'expertise</span>
                    )}
                  </div>
                  {isStep2Done && (
                    <>
                      <div>Validé par : <strong>{bon.valideur_technique_nom || 'Responsable Technique'}</strong></div>
                      <div>Date : <strong>{bon.date_validation_technique ? new Date(bon.date_validation_technique).toLocaleDateString('fr-FR') : '--'}</strong></div>
                    </>
                  )}
                  {bon.remarques_technique && (
                    <div className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                      « {bon.remarques_technique} »
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Magasin */}
              <div className={`p-4 rounded-xl border bg-white ${
                isStep3Done
                  ? bon.decision_magasin === 'AVEC_ECART'
                    ? 'border-amber-300 shadow-sm'
                    : 'border-emerald-300 shadow-sm'
                  : bon.statut === 'VALIDE_TECHNIQUE'
                  ? 'border-purple-400 ring-2 ring-purple-400/20 shadow-sm'
                  : 'border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    isStep3Done
                      ? bon.decision_magasin === 'AVEC_ECART' ? 'text-amber-800' : 'text-emerald-800'
                      : 'text-purple-800'
                  }`}>
                    {isStep3Done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Warehouse className="w-4 h-4 text-purple-600" />
                    )}
                    3. Magasin & Clôture
                  </span>
                  {bon.duree_jours_totale != null && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                      Total : {bon.duree_jours_totale} j
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <div>
                    État : {bon.decision_magasin ? (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        bon.decision_magasin === 'CONFORME'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {bon.decision_magasin}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">En attente de validation</span>
                    )}
                  </div>
                  {isStep3Done && (
                    <>
                      <div>Réceptionné par : <strong>{bon.valideur_magasin_nom || 'Magasinier'}</strong></div>
                      <div>Date clôture : <strong>{bon.date_validation_magasin ? new Date(bon.date_validation_magasin).toLocaleDateString('fr-FR') : '--'}</strong></div>
                    </>
                  )}
                  {bon.remarques_magasin && (
                    <div className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                      « {bon.remarques_magasin} »
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Articles Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-[#003799]" />
                Articles Réceptionnés & États de Contrôle ({bon.lignes?.length || 0})
              </h3>
              <span className="text-xs font-bold text-[#003799]">
                Qté totale : {(bon.quantite_totale || 0).toLocaleString('fr-FR')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-32">Code Article</th>
                    <th className="py-2.5 px-3">Désignation</th>
                    <th className="py-2.5 px-3 w-28">N° Cde SAP</th>
                    <th className="py-2.5 px-3 text-right w-24">Qté Attendue</th>
                    <th className="py-2.5 px-3 text-center w-28">Avis Tech</th>
                    <th className="py-2.5 px-3 text-center w-20">Défauts</th>
                    <th className="py-2.5 px-3 text-right w-28">Qté Magasin</th>
                    <th className="py-2.5 px-3 text-center w-24">Écart</th>
                    <th className="py-2.5 px-3">Remarques</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!bon.lignes || bon.lignes.length === 0) ? (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-slate-400">
                        Aucun article rattaché à ce bon de réception.
                      </td>
                    </tr>
                  ) : (
                    bon.lignes.map((l) => {
                      const attendu = Number(l.quantite_attendue) || 0;
                      const recu = l.quantite_recue_magasin != null ? Number(l.quantite_recue_magasin) : null;
                      const ecart = recu != null ? recu - attendu : null;

                      return (
                        <tr key={l.id || l.ligne_numero} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">{l.ligne_numero}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#003799]">{l.code_article}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{l.designation_article}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{l.numero_commande_sap || l.numero_commande || '--'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                            {attendu.toLocaleString('fr-FR')} {l.unite_mesure}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {l.statut_technique === 'CONFORME' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">Conforme</span>
                            )}
                            {l.statut_technique === 'NON_CONFORME' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">Non Conforme</span>
                            )}
                            {l.statut_technique === 'RESERVE' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">Réserve</span>
                            )}
                            {(!l.statut_technique || l.statut_technique === 'EN_ATTENTE') && (
                              <span className="text-slate-400 italic">En attente</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                              l.defauts_trouves && l.defauts_trouves > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {l.defauts_trouves || 0}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {recu != null ? `${recu.toLocaleString('fr-FR')} ${l.unite_mesure}` : <span className="text-slate-300">--</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {ecart == null ? (
                              <span className="text-slate-300">--</span>
                            ) : Math.abs(ecart) < 0.001 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">0 (OK)</span>
                            ) : ecart > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">+{ecart}</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">{ecart}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {l.remarques_technique || l.remarques_magasin || '--'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Palettes & QR Traceability */}
          {palettes.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-purple-700" />
                  Palettes Traçabilité & QR ({palettes.length})
                </h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {palettes.filter((p) => p.statut === 'DISPONIBLE').length} Disponible(s) pour Sortie
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Code Palette (QR)</th>
                      <th className="py-2.5 px-3">Article</th>
                      <th className="py-2.5 px-3 text-right">Quantité</th>
                      <th className="py-2.5 px-3">Emplacement</th>
                      <th className="py-2.5 px-3">Date Entrée</th>
                      <th className="py-2.5 px-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {palettes.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-[#003799]">
                          <div className="flex items-center gap-1.5">
                            <QrCode className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.code_palette}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-800">{p.article_code}</span>
                          <span className="text-slate-500 ml-1.5 text-[11px] truncate">{p.designation}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-slate-800">
                          {Number(p.quantite).toLocaleString('fr-FR')} pce
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-700">
                          {p.emplacement || 'Zone Magasin'}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {p.date_entree_magasin ? new Date(p.date_entree_magasin).toLocaleDateString('fr-FR') : '--'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Disponible pour Sortie
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Caisses & Lots Fournisseurs Scannés */}
          {caisses.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#003799] uppercase tracking-wider flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#72D54A]" />
                  Pointage des Caisses & Lots Fournisseurs ({caisses.length} caisses scannées)
                </h3>
                <div className="flex items-center gap-2">
                  {lots.map((l) => (
                    <span key={l.lot} className="text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-blue-200 text-slate-700">
                      Lot {l.lot} : <strong>{l.nombre_caisses}</strong> caisses ({l.quantite_totale} pcs)
                    </span>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10.5px]">
                    <tr>
                      <th className="py-2 px-3"># Caisse</th>
                      <th className="py-2 px-3">N° Lot Fournisseur</th>
                      <th className="py-2 px-3 text-right">Quantité</th>
                      <th className="py-2 px-3">Scanné le</th>
                      <th className="py-2 px-3">Opérateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {caisses.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 font-bold text-[#003799]">{c.code_caisse}</td>
                        <td className="py-1.5 px-3 font-bold text-slate-800">{c.numero_lot_fournisseur}</td>
                        <td className="py-1.5 px-3 text-right font-bold text-slate-800">{c.quantite} pcs</td>
                        <td className="py-1.5 px-3 text-slate-500 text-[11px]">
                          {c.date_scan ? new Date(c.date_scan).toLocaleString('fr-FR') : '--'}
                        </td>
                        <td className="py-1.5 px-3 text-slate-600 font-sans">{c.scanne_par || 'Magasinier'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Trail */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Piste d’Audit & Historique des Validations ({bon.historique?.length || 0})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {(!bon.historique || bon.historique.length === 0) ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Aucun historique disponible.
                </div>
              ) : (
                bon.historique.map((h) => (
                  <div key={h.id} className="p-3.5 flex items-start justify-between gap-4 text-xs hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-[#003799] font-mono text-[10px]">
                          {h.action}
                        </span>
                        <span>{h.details}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Effectué par : <strong>{h.user_nom || h.effectue_par_nom || 'Système'}</strong> ({h.role_utilisateur || 'N/A'})
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                      {h.timestamp ? new Date(h.timestamp).toLocaleString('fr-FR') : '--'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            SystemTracabilie &bull; ID #{bon.id}
          </div>
          <div className="flex items-center gap-2">
            {((role === 'magasin' || role === 'admin') && (bon.statut === 'VALIDE_TECHNIQUE')) && onOpenScannerModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenScannerModal(bon);
                }}
                className="px-4 py-2 bg-[#003799] hover:bg-[#002566] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <QrCode className="w-4 h-4 text-[#72D54A]" />
                <span>Scanner les Caisses (Caméra)</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
