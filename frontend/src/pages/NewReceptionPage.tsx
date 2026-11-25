import React, { useState, useEffect } from 'react';
import { User, BonItem, Commande } from '../types';
import { api } from '../services/api';
import { Plus, Trash2, Zap, ArrowLeft, Send, ShoppingCart, CheckCircle, Package } from 'lucide-react';

interface NewReceptionPageProps {
  currentUser: User;
  onCancel: () => void;
  onSubmitSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  initialCommande?: Commande | null;
}

export const NewReceptionPage: React.FC<NewReceptionPageProps> = ({
  currentUser,
  onCancel,
  onSubmitSuccess,
  showToast,
  initialCommande
}) => {
  // Commandes list & selection
  const [commandesList, setCommandesList] = useState<Commande[]>([]);
  const [selectedCommandeId, setSelectedCommandeId] = useState<string>('');
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [loadingCommandes, setLoadingCommandes] = useState(false);

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
      quantite_attendue: 1000,
      unite_mesure: 'pce'
    }
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Load commandes on mount
  useEffect(() => {
    const loadCommandes = async () => {
      try {
        setLoadingCommandes(true);
        const data = await api.getCommandes();
        setCommandesList(data);

        // If an initialCommande is passed, select it
        if (initialCommande) {
          handleSelectCommande(String(initialCommande.id));
        }
      } catch (err: any) {
        console.error('Error loading commandes:', err);
      } finally {
        setLoadingCommandes(false);
      }
    };
    loadCommandes();
  }, [initialCommande]);

  // Handle selecting a commande
  const handleSelectCommande = async (cmdIdStr: string) => {
    setSelectedCommandeId(cmdIdStr);

    if (!cmdIdStr) {
      setSelectedCommande(null);
      return;
    }

    try {
      const cmdId = parseInt(cmdIdStr, 10);
      const fullCmd = await api.getCommandeById(cmdId);
      setSelectedCommande(fullCmd);

      // Auto-fill header fields
      setFournisseur(fullCmd.fournisseur_nom);
      if (!numeroReception.trim()) {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        setNumeroReception(`BR-${fullCmd.numero_commande.replace('CMD-', '')}-${randNum}`);
      }

      // Auto-fill items from commande lines
      if (fullCmd.lignes && fullCmd.lignes.length > 0) {
        const mappedItems: BonItem[] = fullCmd.lignes.map((l, index) => ({
          ligne_numero: index + 1,
          code_article: l.code_article,
          designation_article: l.designation_article,
          numero_commande: fullCmd.numero_commande,
          numero_commande_sap: fullCmd.ref_sap || '',
          quantite_attendue: l.quantite_commandee, // Pre-filled with order quantity, user edits received qty
          unite_mesure: l.unite_mesure || 'pce'
        }));
        setItems(mappedItems);
        showToast(
          `Commande ${fullCmd.numero_commande} chargée : Fournisseur et ${mappedItems.length} article(s) renseignés automatiquement.`,
          'success'
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement de la commande', 'danger');
    }
  };

  const fillExample = () => {
    setNumeroReception('500222' + Math.floor(1000 + Math.random() * 9000));
    setFournisseur('SLR');
    setDateReception(new Date().toISOString().split('T')[0]);
    setRemarquesAppro('Arrivage normal - palettes 1 à 4 vérifiées');
    setItems([
      {
        ligne_numero: 1,
        code_article: '48115600',
        designation_article: 'tete laiton',
        numero_commande: '45761005',
        numero_commande_sap: 'SAP-45761005',
        quantite_attendue: 20184,
        unite_mesure: 'pce'
      },
      {
        ligne_numero: 2,
        code_article: '78182331',
        designation_article: 'bouchon de reglage M10x1',
        numero_commande: '45761005',
        numero_commande_sap: 'SAP-45761005',
        quantite_attendue: 50000,
        unite_mesure: 'pce'
      }
    ]);
    showToast('Exemple SLR inséré avec 2 articles.', 'info');
  };

  const addItemRow = () => {
    const nextIdx = items.length + 1;
    setItems([
      ...items,
      {
        ligne_numero: nextIdx,
        code_article: `ART-${nextIdx < 10 ? '0' + nextIdx : nextIdx}`,
        designation_article: `Article ${nextIdx}`,
        numero_commande: selectedCommande ? selectedCommande.numero_commande : '',
        numero_commande_sap: selectedCommande?.ref_sap || '',
        quantite_attendue: 1000,
        unite_mesure: 'pce'
      }
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) {
      showToast('Un bon de réception doit comporter au moins 1 article.', 'warning');
      return;
    }
    const updated = items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, ligne_numero: i + 1 }));
    setItems(updated);
  };

  const handleItemChange = (idx: number, field: keyof BonItem, val: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = val;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let finalNum = numeroReception.trim();
      let finalFour = fournisseur.trim() || (selectedCommande ? selectedCommande.fournisseur_nom : 'SLR');
      let finalDate = dateReception.trim() || new Date().toISOString().split('T')[0];

      if (!finalNum) {
        finalNum = '500222' + Math.floor(1000 + Math.random() * 9000);
      }

      const payload = {
        numero_reception: finalNum,
        fournisseur: finalFour,
        date_reception: finalDate,
        remarques_appro: remarquesAppro.trim(),
        items: items.map((it) => ({
          code_article: it.code_article.trim() || 'ART-01',
          designation_article: it.designation_article.trim() || 'Article standard',
          numero_commande: it.numero_commande?.trim() || (selectedCommande ? selectedCommande.numero_commande : ''),
          numero_commande_sap: it.numero_commande_sap?.trim() || (selectedCommande?.ref_sap || ''),
          quantite_attendue: parseFloat(String(it.quantite_attendue)) || 1.0,
          unite_mesure: it.unite_mesure || 'pce'
        })),
        user_id: currentUser.id,
        user_nom: currentUser.full_name,
        user_role: currentUser.role
      };

      const res = await fetch('/api/receptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Bon N° ${data.numero_reception} créé avec succès !`, 'success');
        onSubmitSuccess();
      } else {
        showToast(data.error || 'Erreur lors de la création du bon', 'danger');
      }
    } catch (err: any) {
      showToast('Erreur serveur : ' + err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header bar */}
      <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
        <div>
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à la liste des réceptions</span>
          </button>
          <h2 className="text-xl font-bold text-[#003799] flex items-center gap-2">
            <span>Créer un Bon de Réception</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              Étape 1 : Approvisionnement
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sélectionnez une commande pour pré-remplir les articles et quantités, ou saisissez manuellement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fillExample}
            className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Démo SLR</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Section 1: Commande Selector */}
        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#003799] uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#72D54A]" />
              1. Sélectionner une Commande (Remplissage Automatique)
            </h3>
            {loadingCommandes && (
              <span className="text-xs text-slate-400">Chargement des commandes...</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2">
              <select
                value={selectedCommandeId}
                onChange={(e) => handleSelectCommande(e.target.value)}
                className="w-full border-2 border-blue-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#003799] shadow-sm transition"
              >
                <option value="">-- Choisir une commande dans la liste (ou saisie manuelle) --</option>
                {commandesList.map((cmd) => (
                  <option key={cmd.id} value={cmd.id}>
                    {cmd.numero_commande} — {cmd.fournisseur_nom} ({cmd.total_lignes || 0} articles, {cmd.ref_sap || 'Sans SAP'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              {selectedCommande ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Commande <strong>{selectedCommande.numero_commande}</strong> liée avec succès.
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic">
                  En sélectionnant une commande, le fournisseur et tous les articles sont chargés automatiquement.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Reception Identification */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              N° Bon de Réception (ou N° BL) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: 5002220194 ou BR-45761005"
              value={numeroReception}
              onChange={(e) => setNumeroReception(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-bold text-[#003799] focus:outline-none focus:border-[#003799]"
            />
            <p className="text-[11px] text-slate-400 mt-1">Numéro unique de la réception / Bon de livraison.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Fournisseur <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: SLR INDUSTRIE"
              value={fournisseur}
              onChange={(e) => setFournisseur(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#003799]"
            />
            <p className="text-[11px] text-slate-400 mt-1">Nom du fournisseur (rempli automatiquement avec la commande).</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Date de Réception <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={dateReception}
              onChange={(e) => setDateReception(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#003799]"
            />
            <p className="text-[11px] text-slate-400 mt-1">Date effective de l'arrivage physique.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Remarques Approvisionnement / État de livraison
          </label>
          <textarea
            rows={2}
            placeholder="Précisez l'état des colis, transporteur, palettes, observations particulières..."
            value={remarquesAppro}
            onChange={(e) => setRemarquesAppro(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-800 focus:outline-none focus:border-[#003799]"
          />
        </div>

        {/* Section 3: Articles & Received Quantities */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-[#003799]" />
                Articles reçus ({items.length}) — Ajustez les quantités reçues
              </h3>
              <p className="text-xs text-slate-500">
                Vérifiez la liste pré-remplie et ajustez la <strong>quantité reçue</strong> pour chaque article selon le bon de livraison physique.
              </p>
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#003799]" />
              <span>Ajouter un article</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 w-36">Code Article</th>
                  <th className="py-2.5 px-3">Désignation</th>
                  <th className="py-2.5 px-3 w-32">N° Commande</th>
                  <th className="py-2.5 px-3 w-32">Réf SAP</th>
                  <th className="py-2.5 px-3 w-36 text-right bg-blue-100/60 text-[#003799]">
                    Qté Reçue <span className="text-[10px] lowercase">(ajuster)</span>
                  </th>
                  <th className="py-2.5 px-3 w-20 text-center">Unité</th>
                  <th className="py-2.5 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                      {it.ligne_numero}
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={it.code_article}
                        onChange={(e) => handleItemChange(idx, 'code_article', e.target.value)}
                        placeholder="Ex: 48115600"
                        className="w-full border border-slate-300 rounded px-2 py-1 font-mono font-bold text-[#003799] focus:outline-none focus:border-[#003799]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={it.designation_article}
                        onChange={(e) => handleItemChange(idx, 'designation_article', e.target.value)}
                        placeholder="Ex: tête laiton"
                        className="w-full border border-slate-300 rounded px-2 py-1 font-medium focus:outline-none focus:border-[#003799]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={it.numero_commande}
                        onChange={(e) => handleItemChange(idx, 'numero_commande', e.target.value)}
                        placeholder="Ex: CMD-2026-001"
                        className="w-full border border-slate-300 rounded px-2 py-1 font-mono focus:outline-none focus:border-[#003799]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={it.numero_commande_sap}
                        onChange={(e) => handleItemChange(idx, 'numero_commande_sap', e.target.value)}
                        placeholder="Ex: SAP-45761005"
                        className="w-full border border-slate-300 rounded px-2 py-1 font-mono focus:outline-none focus:border-[#003799]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right bg-blue-50/30">
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        required
                        value={it.quantite_attendue}
                        onChange={(e) => handleItemChange(idx, 'quantite_attendue', parseFloat(e.target.value) || 0)}
                        className="w-full border-2 border-blue-400 bg-white rounded px-2 py-1 text-right font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003799]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={it.unite_mesure}
                        onChange={(e) => handleItemChange(idx, 'unite_mesure', e.target.value)}
                        className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-medium focus:outline-none focus:border-[#003799]"
                      >
                        <option value="pce">pce</option>
                        <option value="kg">kg</option>
                        <option value="m">m</option>
                        <option value="l">l</option>
                        <option value="lot">lot</option>
                        <option value="carton">carton</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        title="Supprimer la ligne"
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

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-[#003799] hover:bg-[#002566] text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4 text-[#72D54A]" />
            <span>{submitting ? 'Enregistrement...' : '🚀 Valider & Envoyer au Contrôle Technique'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
