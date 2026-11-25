import React, { useState, useEffect } from 'react';
import { BonReception, BonItem, User } from '../types';
import { api } from '../services/api';
import {
  X,
  Save,
  Trash2,
  Plus,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface EditReceptionModalProps {
  bon: BonReception | null;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const EditReceptionModal: React.FC<EditReceptionModalProps> = ({
  bon,
  currentUser,
  onClose,
  onSuccess,
  showToast
}) => {
  if (!bon) return null;

  const role = currentUser.role;
  const isAppro = role === 'appro' || role === 'admin';
  const isTech = role === 'technique' || role === 'admin';
  const isMag = role === 'magasin' || role === 'admin';
  const isAdmin = role === 'admin';

  // Header State
  const [numeroReception, setNumeroReception] = useState(bon.numero_reception || '');
  const [fournisseur, setFournisseur] = useState(bon.fournisseur || '');
  const [dateReception, setDateReception] = useState(
    bon.date_reception ? bon.date_reception.split('T')[0] : ''
  );
  const [statut, setStatut] = useState(bon.statut || 'EN_ATTENTE_TECHNIQUE');
  const [decisionTechnique, setDecisionTechnique] = useState(bon.decision_technique || '');
  const [decisionMagasin, setDecisionMagasin] = useState(bon.decision_magasin || '');
  const [remarquesAppro, setRemarquesAppro] = useState(bon.remarques_appro || '');
  const [remarquesTechnique, setRemarquesTechnique] = useState(bon.remarques_technique || '');
  const [remarquesMagasin, setRemarquesMagasin] = useState(bon.remarques_magasin || '');

  // Lines State
  const [items, setItems] = useState<BonItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [suppliersList, setSuppliersList] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchFullBon = async () => {
      try {
        const full = await api.getReceptionById(bon.id);
        if (isMounted) {
          setNumeroReception(full.numero_reception || '');
          setFournisseur(full.fournisseur || '');
          setDateReception(full.date_reception ? full.date_reception.split('T')[0] : '');
          setStatut(full.statut);
          setDecisionTechnique(full.decision_technique || '');
          setDecisionMagasin(full.decision_magasin || '');
          setRemarquesAppro(full.remarques_appro || '');
          setRemarquesTechnique(full.remarques_technique || '');
          setRemarquesMagasin(full.remarques_magasin || '');
          if (full.lignes && full.lignes.length > 0) {
            setItems(full.lignes);
          } else {
            setItems([
              {
                ligne_numero: 1,
                code_article: '',
                designation_article: '',
                numero_commande: '',
                numero_commande_sap: '',
                quantite_attendue: 1,
                unite_mesure: 'pce',
                statut_technique: 'EN_ATTENTE',
                statut_magasin: 'EN_ATTENTE',
                defauts_trouves: 0
              }
            ]);
          }
        }
      } catch (e) {
        if (isMounted && bon.lignes) {
          setItems(bon.lignes);
        }
      }
    };

    fetchFullBon();
    api.getSuppliers().then((res) => {
      if (isMounted) setSuppliersList(res);
    });

    return () => {
      isMounted = false;
    };
  }, [bon.id]);

  const handleItemChange = (index: number, field: keyof BonItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddItem = () => {
    if (!isAppro) return;
    setItems((prev) => [
      ...prev,
      {
        ligne_numero: prev.length + 1,
        code_article: `ART-${String(prev.length + 1).padStart(2, '0')}`,
        designation_article: `Article ${prev.length + 1}`,
        numero_commande: '',
        numero_commande_sap: '',
        quantite_attendue: 100,
        unite_mesure: 'pce',
        statut_technique: 'EN_ATTENTE',
        statut_magasin: 'EN_ATTENTE',
        defauts_trouves: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (!isAppro) return;
    if (items.length <= 1) {
      showToast('Le bon de réception doit comporter au moins un article.', 'warning');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, ligne_numero: i + 1 })));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAppro) {
      if (!numeroReception.trim()) {
        showToast('Le N° de réception est obligatoire.', 'warning');
        return;
      }
      if (!fournisseur.trim()) {
        showToast('Le fournisseur est obligatoire.', 'warning');
        return;
      }
      if (items.length === 0) {
        showToast('Veuillez renseigner au moins un article.', 'warning');
        return;
      }
    }

    try {
      setSaving(true);
      await api.updateReception(bon.id, {
        user_role: role,
        user_id: currentUser.id,
        user_nom: currentUser.full_name,
        // Appro fields
        numero_reception: isAppro ? numeroReception.trim() : undefined,
        fournisseur: isAppro ? fournisseur.trim() : undefined,
        date_reception: isAppro ? dateReception : undefined,
        remarques_appro: isAppro ? remarquesAppro.trim() : undefined,
        // Technique fields
        decision_technique: isTech ? (decisionTechnique || null) : undefined,
        remarques_technique: isTech ? remarquesTechnique.trim() : undefined,
        // Magasin fields
        decision_magasin: isMag ? (decisionMagasin || null) : undefined,
        remarques_magasin: isMag ? remarquesMagasin.trim() : undefined,
        // Admin general status
        statut: isAdmin ? statut : undefined,
        // Lines
        items
      });

      showToast(`Bon N° ${numeroReception} mis à jour avec succès.`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la modification du bon', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    try {
      setDeleting(true);
      await api.deleteReception(bon.id);
      showToast(`Bon N° ${numeroReception} supprimé avec succès.`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la suppression', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#003799]/10 text-[#003799] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>Modification du Bon de Réception</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 text-[#003799] font-bold">
                  {bon.numero_reception}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Chaque profil modifie uniquement les informations sous sa responsabilité.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope banner */}
        <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Votre profil actif :</span>
            <span className="px-2 py-0.5 rounded font-bold uppercase text-[11px] bg-[#003799] text-white">
              {role === 'appro'
                ? 'Approvisionnement'
                : role === 'technique'
                ? 'Contrôle Technique'
                : role === 'magasin'
                ? 'Magasinier'
                : 'Administrateur'}
            </span>
          </div>
          <span className="text-slate-500 text-[11px]">
            {role === 'appro' && 'Champs modifiables : En-tête, articles attendus et remarques approvisionnement.'}
            {role === 'technique' && 'Champs modifiables : Évaluation technique globale, défauts et statut par article.'}
            {role === 'magasin' && 'Champs modifiables : Pointage des quantités physiques reçues et décision magasin.'}
            {role === 'admin' && 'Tous les champs sont déverrouillés.'}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* 1. Header Information Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Informations Générales (Approvisionnement)
              </span>
              {!isAppro && (
                <span className="text-[11px] text-slate-400 italic">
                  Lecture seule (Réservé à l'Approvisionnement)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  N° Réception *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAppro}
                  value={numeroReception}
                  onChange={(e) => setNumeroReception(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#003799] focus:outline-none ${
                    isAppro ? 'bg-white border-slate-300 text-[#003799]' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fournisseur *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAppro}
                  list="suppliers-datalist"
                  value={fournisseur}
                  onChange={(e) => setFournisseur(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-[#003799] focus:outline-none ${
                    isAppro ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                />
                <datalist id="suppliers-datalist">
                  {suppliersList.map((s, idx) => (
                    <option key={idx} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Date de Réception *
                </label>
                <input
                  type="date"
                  required
                  disabled={!isAppro}
                  value={dateReception}
                  onChange={(e) => setDateReception(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-[#003799] focus:outline-none ${
                    isAppro ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Statut Global du Bon
                </label>
                <select
                  disabled={!isAdmin}
                  value={statut}
                  onChange={(e) => setStatut(e.target.value as any)}
                  className={`w-full px-3 py-2 border rounded-lg text-xs font-bold focus:ring-2 focus:ring-[#003799] focus:outline-none ${
                    isAdmin ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <option value="EN_ATTENTE_TECHNIQUE">En attente Contrôle Tech</option>
                  <option value="EN_COURS_TECHNIQUE">En cours Contrôle Tech</option>
                  <option value="VALIDE_TECHNIQUE">Attente Magasin (Tech Validé)</option>
                  <option value="VALIDE_MAGASIN">Validé Magasin (Clôturé)</option>
                  <option value="NON_CONFORME">Non Conforme</option>
                  <option value="ECART_MAGASIN">Clôturé avec Écart</option>
                </select>
              </div>
            </div>

            {/* Decisions sections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    2. Avis Contrôle Technique
                  </label>
                  {!isTech && <span className="text-[10px] text-slate-400 italic">Réservé Contrôle Tech</span>}
                </div>
                <select
                  disabled={!isTech}
                  value={decisionTechnique}
                  onChange={(e) => setDecisionTechnique(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-xs font-bold focus:ring-2 focus:ring-[#003799] focus:outline-none ${
                    isTech ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <option value="">(Non défini / En attente)</option>
                  <option value="CONFORME">CONFORME</option>
                  <option value="AVEC_RESERVE">AVEC RÉSERVE</option>
                  <option value="NON_CONFORME">NON CONFORME</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    3. Décision Réception Magasin
                  </label>
                  {!isMag && <span className="text-[10px] text-slate-400 italic">Réservé Magasin</span>}
                </div>
                <select
                  disabled={!isMag}
                  value={decisionMagasin}
                  onChange={(e) => setDecisionMagasin(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-xs font-bold focus:ring-2 focus:ring-[#003799] focus:outline-none ${
                    isMag ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <option value="">(Non défini / En attente)</option>
                  <option value="CONFORME">CONFORME</option>
                  <option value="AVEC_ECART">AVEC ÉCART</option>
                  <option value="REFUSE">REFUSÉ</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Articles Lines Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Articles & Détails ({items.length})
              </span>
              {isAppro && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-blue-50 text-[#003799] hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un article
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                  <tr>
                    <th className="py-2.5 px-2 w-10 text-center">#</th>
                    <th className="py-2.5 px-2 min-w-[120px]">Code Article</th>
                    <th className="py-2.5 px-2 min-w-[170px]">Désignation</th>
                    <th className="py-2.5 px-2 min-w-[100px]">N° Commande</th>
                    <th className="py-2.5 px-2 min-w-[100px]">Réf SAP</th>
                    <th className="py-2.5 px-2 min-w-[90px] text-right">Qté Attendue</th>
                    <th className="py-2.5 px-2 min-w-[90px] text-right">Qté Reçue</th>
                    <th className="py-2.5 px-2 min-w-[65px] text-center">Unité</th>
                    <th className="py-2.5 px-2 min-w-[75px] text-center">Défauts</th>
                    <th className="py-2.5 px-2 min-w-[105px]">Statut Tech</th>
                    <th className="py-2.5 px-2 min-w-[105px]">Statut Mag</th>
                    {isAppro && <th className="py-2.5 px-2 w-10 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2 px-2 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Code */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          required
                          disabled={!isAppro}
                          value={it.code_article}
                          onChange={(e) => handleItemChange(idx, 'code_article', e.target.value)}
                          className={`w-full px-2 py-1 border rounded font-mono text-xs focus:ring-1 focus:ring-[#003799] focus:outline-none ${
                            isAppro ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          }`}
                        />
                      </td>

                      {/* Designation */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          required
                          disabled={!isAppro}
                          value={it.designation_article}
                          onChange={(e) => handleItemChange(idx, 'designation_article', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-[#003799] focus:outline-none ${
                            isAppro ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          }`}
                        />
                      </td>

                      {/* Commande */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          disabled={!isAppro}
                          value={it.numero_commande || ''}
                          onChange={(e) => handleItemChange(idx, 'numero_commande', e.target.value)}
                          className={`w-full px-2 py-1 border rounded font-mono text-xs focus:ring-1 focus:ring-[#003799] focus:outline-none ${
                            isAppro ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          }`}
                        />
                      </td>

                      {/* SAP */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          disabled={!isAppro}
                          value={it.numero_commande_sap || ''}
                          onChange={(e) => handleItemChange(idx, 'numero_commande_sap', e.target.value)}
                          className={`w-full px-2 py-1 border rounded font-mono text-xs focus:ring-1 focus:ring-[#003799] focus:outline-none ${
                            isAppro ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          }`}
                        />
                      </td>

                      {/* Quantité attendue (Appro) */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          disabled={!isAppro}
                          value={it.quantite_attendue}
                          onChange={(e) => handleItemChange(idx, 'quantite_attendue', parseFloat(e.target.value) || 0)}
                          className={`w-full px-2 py-1 border rounded text-xs text-right font-mono font-bold focus:ring-1 focus:ring-[#003799] focus:outline-none ${
                            isAppro ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          }`}
                        />
                      </td>

                      {/* Quantité reçue magasin (Magasin) */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          disabled={!isMag}
                          value={it.quantite_recue_magasin != null ? it.quantite_recue_magasin : ''}
                          onChange={(e) => handleItemChange(idx, 'quantite_recue_magasin', e.target.value === '' ? null : parseFloat(e.target.value))}
                          placeholder="--"
                          className={`w-full px-2 py-1 border rounded text-xs text-right font-mono font-bold focus:ring-1 focus:ring-[#003799] focus:outline-none ${
                            isMag ? 'bg-white border-slate-300 text-purple-950' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          }`}
                        />
                      </td>

                      {/* Unité */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          disabled={!isAppro}
                          value={it.unite_mesure}
                          onChange={(e) => handleItemChange(idx, 'unite_mesure', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs text-center focus:ring-1 focus:ring-[#003799] focus:outline-none ${
                            isAppro ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          }`}
                        />
                      </td>

                      {/* Défauts (Technique) */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          disabled={!isTech}
                          value={it.defauts_trouves || 0}
                          onChange={(e) => handleItemChange(idx, 'defauts_trouves', parseInt(e.target.value, 10) || 0)}
                          className={`w-full px-2 py-1 border rounded text-xs text-center font-bold focus:ring-1 focus:ring-[#003799] focus:outline-none ${
                            isTech ? 'bg-white border-slate-300 text-rose-700' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          }`}
                        />
                      </td>

                      {/* Statut Tech (Technique) */}
                      <td className="py-2 px-2">
                        <select
                          disabled={!isTech}
                          value={it.statut_technique || 'EN_ATTENTE'}
                          onChange={(e) => handleItemChange(idx, 'statut_technique', e.target.value)}
                          className={`w-full px-1.5 py-1 border rounded text-[11px] focus:ring-1 focus:ring-[#003799] focus:outline-none ${
                            isTech ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <option value="EN_ATTENTE">En attente</option>
                          <option value="CONFORME">Conforme</option>
                          <option value="NON_CONFORME">Non conforme</option>
                          <option value="RESERVE">Réserve</option>
                        </select>
                      </td>

                      {/* Statut Mag (Magasin) */}
                      <td className="py-2 px-2">
                        <select
                          disabled={!isMag}
                          value={it.statut_magasin || 'EN_ATTENTE'}
                          onChange={(e) => handleItemChange(idx, 'statut_magasin', e.target.value)}
                          className={`w-full px-1.5 py-1 border rounded text-[11px] focus:ring-1 focus:ring-[#003799] focus:outline-none ${
                            isMag ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <option value="EN_ATTENTE">En attente</option>
                          <option value="CONFORME">Conforme</option>
                          <option value="ECART">Écart</option>
                          <option value="REFUSE">Refusé</option>
                        </select>
                      </td>

                      {/* Delete Line (Appro only) */}
                      {isAppro && (
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Retirer la ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Observations Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Observations & Remarques par Métier
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Approvisionnement
                </label>
                <textarea
                  rows={2}
                  disabled={!isAppro}
                  value={remarquesAppro}
                  onChange={(e) => setRemarquesAppro(e.target.value)}
                  placeholder={isAppro ? 'Notes approvisionnement...' : 'Aucune remarque appro'}
                  className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-[#003799] focus:outline-none ${
                    isAppro ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contrôle Technique
                </label>
                <textarea
                  rows={2}
                  disabled={!isTech}
                  value={remarquesTechnique}
                  onChange={(e) => setRemarquesTechnique(e.target.value)}
                  placeholder={isTech ? 'Notes contrôle technique...' : 'Aucune remarque technique'}
                  className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-[#003799] focus:outline-none ${
                    isTech ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Magasin
                </label>
                <textarea
                  rows={2}
                  disabled={!isMag}
                  value={remarquesMagasin}
                  onChange={(e) => setRemarquesMagasin(e.target.value)}
                  placeholder={isMag ? 'Notes magasin...' : 'Aucune remarque magasin'}
                  className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-[#003799] focus:outline-none ${
                    isMag ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Delete Confirmation Box (Admin only) */}
          {showDeleteConfirm && isAdmin && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <span className="text-xs font-medium text-rose-900">
                  Êtes-vous certain de vouloir supprimer définitivement ce bon de réception et toutes ses lignes ?
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition"
                >
                  {deleting ? 'Suppression...' : 'Confirmer suppression'}
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div>
              {!showDeleteConfirm && isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer ce bon
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-[#003799] hover:bg-[#002b77] text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
