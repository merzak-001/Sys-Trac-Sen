import React, { useState, useEffect } from 'react';
import { User, BonItem, Commande, Fournisseur } from '../types';
import { api } from '../services/api';
import { X, Plus, Trash2, Check, FileText, ShoppingCart } from 'lucide-react';

interface CreateReceptionModalProps {
  currentUser: User;
  initialCommande?: Commande | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const CreateReceptionModal: React.FC<CreateReceptionModalProps> = ({
  currentUser,
  initialCommande,
  onClose,
  onSuccess,
  showToast
}) => {
  // Commandes list & selection
  const [commandesList, setCommandesList] = useState<Commande[]>([]);
  const [selectedCommandeId, setSelectedCommandeId] = useState<string>('');
  const [suppliersList, setSuppliersList] = useState<Fournisseur[]>([]);

  // Form fields
  const [numeroReception, setNumeroReception] = useState('');
  const [fournisseur, setFournisseur] = useState('');
  const [dateReception, setDateReception] = useState(new Date().toISOString().split('T')[0]);
  const [remarquesAppro, setRemarquesAppro] = useState('');
  const [items, setItems] = useState<BonItem[]>([
    {
      ligne_numero: 1,
      code_article: 'ART-01',
      designation_article: 'Article 1',
      numero_commande: '',
      numero_commande_sap: '',
      quantite_attendue: 100,
      unite_mesure: 'pce'
    }
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadInitData = async () => {
      try {
        const [cmdData, supData] = await Promise.all([
          api.getCommandes(),
          api.getFournisseurs()
        ]);
        if (!isMounted) return;
        setCommandesList(cmdData);
        setSuppliersList(supData);

        if (initialCommande) {
          handleSelectCommande(String(initialCommande.id), cmdData);
        } else {
          // Generate default reception number
          const rand = Math.floor(1000 + Math.random() * 9000);
          setNumeroReception(`BR-2026-${rand}`);
        }
      } catch (err: any) {
        console.error('Error loading initial data:', err);
      }
    };
    loadInitData();
    return () => {
      isMounted = false;
    };
  }, [initialCommande]);

  const handleSelectCommande = async (cmdIdStr: string, listOverride?: Commande[]) => {
    setSelectedCommandeId(cmdIdStr);

    if (!cmdIdStr) return;

    try {
      const cmdId = parseInt(cmdIdStr, 10);
      const fullCmd = await api.getCommandeById(cmdId);

      setFournisseur(fullCmd.fournisseur_nom);
      if (!numeroReception.trim() || numeroReception.startsWith('BR-2026-')) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        setNumeroReception(`BR-${fullCmd.numero_commande.replace(/[^a-zA-Z0-9]/g, '')}-${rand}`);
      }

      if (fullCmd.lignes && fullCmd.lignes.length > 0) {
        const mapped: BonItem[] = fullCmd.lignes.map((l, index) => ({
          ligne_numero: index + 1,
          code_article: l.code_article,
          designation_article: l.designation_article,
          numero_commande: fullCmd.numero_commande,
          numero_commande_sap: fullCmd.ref_sap || '',
          quantite_attendue: l.quantite_commandee,
          unite_mesure: l.unite_mesure || 'pce'
        }));
        setItems(mapped);
        showToast(
          `Commande ${fullCmd.numero_commande} chargée : Fournisseur et ${mapped.length} article(s) renseignés automatiquement.`,
          'info'
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement de la commande', 'danger');
    }
  };

  const handleItemChange = (index: number, field: keyof BonItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        ligne_numero: prev.length + 1,
        code_article: `ART-${String(prev.length + 1).padStart(2, '0')}`,
        designation_article: `Article ${prev.length + 1}`,
        numero_commande: '',
        numero_commande_sap: '',
        quantite_attendue: 100,
        unite_mesure: 'pce'
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showToast('Le bon de réception doit comporter au moins un article.', 'warning');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, ligne_numero: i + 1 })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numeroReception.trim()) {
      showToast('Le N° de bon de réception est requis.', 'warning');
      return;
    }
    if (!fournisseur.trim()) {
      showToast('Le fournisseur est requis.', 'warning');
      return;
    }
    if (items.length === 0) {
      showToast('Veuillez ajouter au moins une ligne article.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.createReception({
        numero_reception: numeroReception.trim(),
        fournisseur: fournisseur.trim(),
        date_reception: dateReception,
        remarques_appro: remarquesAppro.trim(),
        items,
        user_id: currentUser.id,
        user_nom: currentUser.full_name
      });

      showToast(`Bon de réception N° ${numeroReception} créé avec succès.`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la création du bon', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#003799]/10 text-[#003799] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Créer un Nouveau Bon de Réception
              </h2>
              <p className="text-xs text-slate-500">
                Saisie de l'arrivage marchandises et transmission au Contrôle Technique.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. Commande d'achat liée */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#003799]">
              <ShoppingCart className="w-4 h-4" />
              <span>Commande Fournisseur Référente</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={selectedCommandeId}
                onChange={(e) => handleSelectCommande(e.target.value)}
                className="w-full sm:w-96 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-[#003799] focus:outline-none"
              >
                <option value="">(Optionnel) Choisir une commande à réceptionner...</option>
                {commandesList.map((cmd) => (
                  <option key={cmd.id} value={cmd.id}>
                    {cmd.numero_commande} — {cmd.fournisseur_nom} {cmd.ref_sap ? `(SAP: ${cmd.ref_sap})` : ''}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">
                La sélection d'une commande pré-remplit automatiquement le fournisseur et tous les articles.
              </span>
            </div>
          </div>

          {/* 2. Informations Générales */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Informations Générales
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  N° Bon de Réception <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={numeroReception}
                  onChange={(e) => setNumeroReception(e.target.value)}
                  placeholder="Ex: BR-2026-001"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-[#003799] focus:ring-2 focus:ring-[#003799] focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fournisseur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="suppliers-list-create"
                  value={fournisseur}
                  onChange={(e) => setFournisseur(e.target.value)}
                  placeholder="Nom du fournisseur"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#003799] focus:outline-none bg-white"
                />
                <datalist id="suppliers-list-create">
                  {suppliersList.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Date de Réception <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dateReception}
                  onChange={(e) => setDateReception(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#003799] focus:outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* 3. Articles de Réception */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Articles et Quantités Attendues ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-blue-50 text-[#003799] hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un article
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-40">Code Article *</th>
                    <th className="py-2.5 px-3">Désignation Article *</th>
                    <th className="py-2.5 px-3 w-32">N° Commande</th>
                    <th className="py-2.5 px-3 w-32">Réf SAP</th>
                    <th className="py-2.5 px-3 w-28 text-right">Qté Attendue *</th>
                    <th className="py-2.5 px-3 w-20 text-center">Unité</th>
                    <th className="py-2.5 px-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          required
                          value={it.code_article}
                          onChange={(e) => handleItemChange(idx, 'code_article', e.target.value)}
                          placeholder="Code"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono font-semibold text-xs focus:ring-1 focus:ring-[#003799] focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          required
                          value={it.designation_article}
                          onChange={(e) => handleItemChange(idx, 'designation_article', e.target.value)}
                          placeholder="Désignation"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#003799] focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={it.numero_commande || ''}
                          onChange={(e) => handleItemChange(idx, 'numero_commande', e.target.value)}
                          placeholder="CMD"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-[#003799] focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={it.numero_commande_sap || ''}
                          onChange={(e) => handleItemChange(idx, 'numero_commande_sap', e.target.value)}
                          placeholder="SAP"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-[#003799] focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="any"
                          required
                          min="0.001"
                          value={it.quantite_attendue}
                          onChange={(e) => handleItemChange(idx, 'quantite_attendue', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono font-bold text-right text-xs focus:ring-1 focus:ring-[#003799] focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={it.unite_mesure}
                          onChange={(e) => handleItemChange(idx, 'unite_mesure', e.target.value)}
                          placeholder="pce"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-center text-xs focus:ring-1 focus:ring-[#003799] focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Retirer cette ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Observations */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Remarques / Observations Approvisionnement
            </span>
            <textarea
              rows={2}
              value={remarquesAppro}
              onChange={(e) => setRemarquesAppro(e.target.value)}
              placeholder="Précisions de livraison, transporteur, état des colis..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#003799] focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-semibold transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#003799] hover:bg-[#002b77] text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Création en cours...' : 'Créer le Bon de Réception'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

