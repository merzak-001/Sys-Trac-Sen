import React, { useState, useEffect } from 'react';
import { Commande, Fournisseur, Article, User, LigneCommande } from '../types';
import { api } from '../services/api';
import { Plus, Search, Edit2, Trash2, Eye, ShoppingCart, RefreshCw, X, Check, FileText } from 'lucide-react';

interface CommandesPageProps {
  currentUser: User;
  showToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  onNavigateToNewReception?: (commande: Commande) => void;
}

export const CommandesPage: React.FC<CommandesPageProps> = ({ showToast }) => {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('TOUS');

  // Suppliers & Articles lists for selection
  const [suppliersList, setSuppliersList] = useState<Fournisseur[]>([]);
  const [articlesList, setArticlesList] = useState<Article[]>([]);

  // Create / Edit Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCommande, setEditingCommande] = useState<Commande | null>(null);
  const [numCommande, setNumCommande] = useState('');
  const [dateCommande, setDateCommande] = useState(new Date().toISOString().split('T')[0]);
  const [refSap, setRefSap] = useState('');
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [statutCommande, setStatutCommande] = useState('EN_COURS');
  const [orderLines, setOrderLines] = useState<LigneCommande[]>([
    {
      ligne_numero: 1,
      code_article: '',
      designation_article: '',
      quantite_commandee: 1000,
      unite_mesure: 'pce'
    }
  ]);
  const [saving, setSaving] = useState(false);

  // Detail Modal
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cmdData, supData, artData] = await Promise.all([
        api.getCommandes(search, statutFilter),
        api.getFournisseurs(),
        api.getArticles()
      ]);
      setCommandes(cmdData);
      setSuppliersList(supData);
      setArticlesList(artData);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement des commandes', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statutFilter]);

  const openCreateModal = () => {
    setEditingCommande(null);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setNumCommande(`CMD-2026-${randomSuffix}`);
    setDateCommande(new Date().toISOString().split('T')[0]);
    setRefSap(`SAP-${Math.floor(40000000 + Math.random() * 90000000)}`);
    setSelectedFournisseur(suppliersList.length > 0 ? suppliersList[0] : null);
    setStatutCommande('EN_COURS');

    // Initial lines using existing articles if available
    if (articlesList.length > 0) {
      setOrderLines([
        {
          ligne_numero: 1,
          article_id: articlesList[0].id,
          code_article: articlesList[0].code,
          designation_article: articlesList[0].name,
          quantite_commandee: 1000,
          unite_mesure: articlesList[0].unite_mesure || 'pce'
        }
      ]);
    } else {
      setOrderLines([
        {
          ligne_numero: 1,
          code_article: '',
          designation_article: '',
          quantite_commandee: 1000,
          unite_mesure: 'pce'
        }
      ]);
    }
    setShowCreateModal(true);
  };

  const openEditModal = async (cmd: Commande) => {
    try {
      setSaving(true);
      const fullCmd = await api.getCommandeById(cmd.id);
      setEditingCommande(fullCmd);
      setNumCommande(fullCmd.numero_commande);
      setDateCommande(fullCmd.date_commande ? fullCmd.date_commande.split('T')[0] : '');
      setRefSap(fullCmd.ref_sap || '');
      setStatutCommande(fullCmd.statut || 'EN_COURS');

      const matchedSup = suppliersList.find((s) => s.id === fullCmd.fournisseur_id) || 
                         suppliersList.find((s) => s.name === fullCmd.fournisseur_nom) ||
                         { id: fullCmd.fournisseur_id || 1, name: fullCmd.fournisseur_nom, code: 'SUP' } as Fournisseur;
      setSelectedFournisseur(matchedSup);

      if (fullCmd.lignes && fullCmd.lignes.length > 0) {
        setOrderLines(fullCmd.lignes);
      } else {
        setOrderLines([
          {
            ligne_numero: 1,
            code_article: '',
            designation_article: '',
            quantite_commandee: 100,
            unite_mesure: 'pce'
          }
        ]);
      }
      setShowCreateModal(true);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement de la commande', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const addLine = () => {
    const nextIdx = orderLines.length + 1;
    const defaultArt = articlesList[nextIdx % articlesList.length] || null;
    setOrderLines([
      ...orderLines,
      {
        ligne_numero: nextIdx,
        article_id: defaultArt ? defaultArt.id : null,
        code_article: defaultArt ? defaultArt.code : `ART-${nextIdx}`,
        designation_article: defaultArt ? defaultArt.name : `Article ${nextIdx}`,
        quantite_commandee: 1000,
        unite_mesure: defaultArt?.unite_mesure || 'pce'
      }
    ]);
  };

  const removeLine = (idx: number) => {
    if (orderLines.length <= 1) {
      showToast('Une commande doit comporter au moins 1 ligne.', 'warning');
      return;
    }
    const updated = orderLines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, ligne_numero: i + 1 }));
    setOrderLines(updated);
  };

  const handleLineArticleSelect = (idx: number, articleIdStr: string) => {
    const artId = parseInt(articleIdStr, 10);
    const art = articlesList.find((a) => a.id === artId);
    const updated = [...orderLines];
    if (art) {
      updated[idx].article_id = art.id;
      updated[idx].code_article = art.code;
      updated[idx].designation_article = art.name;
      updated[idx].unite_mesure = art.unite_mesure || 'pce';
    } else {
      updated[idx].article_id = null;
    }
    setOrderLines(updated);
  };

  const handleLineChange = (idx: number, field: keyof LigneCommande, val: any) => {
    const updated = [...orderLines];
    (updated[idx] as any)[field] = val;
    setOrderLines(updated);
  };

  const handleSaveCommande = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numCommande.trim() || !dateCommande || !selectedFournisseur) {
      showToast('Veuillez renseigner le N° de commande, la date et le fournisseur.', 'warning');
      return;
    }

    if (orderLines.length === 0) {
      showToast('Ajoutez au moins un article.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        numero_commande: numCommande.trim(),
        date_commande: dateCommande,
        ref_sap: refSap.trim() || null,
        fournisseur_id: selectedFournisseur.id,
        fournisseur_nom: selectedFournisseur.name,
        statut: statutCommande,
        lignes: orderLines.map((l) => ({
          article_id: l.article_id,
          code_article: l.code_article.trim(),
          designation_article: l.designation_article.trim(),
          quantite_commandee: parseFloat(String(l.quantite_commandee)) || 1.0,
          unite_mesure: l.unite_mesure || 'pce',
          quantite_deja_recue: parseFloat(String(l.quantite_deja_recue || 0)) || 0
        }))
      };

      if (editingCommande) {
        await api.updateCommande(editingCommande.id, payload);
        showToast(`Commande "${numCommande}" mise à jour avec succès.`, 'success');
      } else {
        await api.createCommande(payload);
        showToast(`Commande "${numCommande}" enregistrée avec succès.`, 'success');
      }

      setShowCreateModal(false);
      setEditingCommande(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const openDetailModal = async (id: number) => {
    try {
      setDetailLoading(true);
      const data = await api.getCommandeById(id);
      setSelectedCommande(data);
    } catch (err: any) {
      showToast(err.message, 'danger');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteCommande(id);
      showToast('Commande supprimée avec succès.', 'success');
      setDeletingId(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#003799] flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#72D54A]" />
            Gestion des Commandes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Création et suivi des commandes fournisseurs (hors commandes SAP) avec articles et quantités.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-[#003799] hover:bg-[#002b77] text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Commande
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Rechercher par N° commande, SAP, fournisseur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003799]"
            />
          </div>
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#003799]"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="EN_COURS">En cours</option>
            <option value="RECU_PARTIEL">Reçu partiel</option>
            <option value="RECU_TOTAL">Reçu total</option>
            <option value="ANNULE">Annulé</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-gray-500">
          Total : <span className="text-[#003799] font-bold">{commandes.length}</span> commande(s)
        </div>
      </div>

      {/* Commandes Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100 uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3.5 px-4">N° Commande</th>
                <th className="py-3.5 px-4">Date Commande</th>
                <th className="py-3.5 px-4">Réf SAP</th>
                <th className="py-3.5 px-4">Fournisseur</th>
                <th className="py-3.5 px-4 text-center">Nb Articles</th>
                <th className="py-3.5 px-4 text-right">Qté Totale</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && commandes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    Chargement des commandes...
                  </td>
                </tr>
              ) : commandes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    Aucune commande trouvée.
                  </td>
                </tr>
              ) : (
                commandes.map((cmd) => (
                  <tr key={cmd.id} className="hover:bg-blue-50/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#003799]">
                      {cmd.numero_commande}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700">
                      {cmd.date_commande ? new Date(cmd.date_commande).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-500">
                      {cmd.ref_sap || <span className="italic text-gray-300">-</span>}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">
                      {cmd.fournisseur_nom}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 bg-blue-50 text-[#003799] font-bold rounded text-xs">
                        {cmd.total_lignes || 0} art.
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-gray-900">
                      {(cmd.quantite_totale || 0).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          cmd.statut === 'EN_COURS'
                            ? 'bg-blue-100 text-blue-800'
                            : cmd.statut === 'RECU_TOTAL'
                            ? 'bg-green-100 text-green-800'
                            : cmd.statut === 'RECU_PARTIEL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {cmd.statut === 'EN_COURS'
                          ? 'En cours'
                          : cmd.statut === 'RECU_TOTAL'
                          ? 'Reçu Total'
                          : cmd.statut === 'RECU_PARTIEL'
                          ? 'Reçu Partiel'
                          : cmd.statut}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailModal(cmd.id)}
                          className="p-1.5 text-gray-400 hover:text-[#003799] hover:bg-blue-50 rounded transition"
                          title="Voir les articles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(cmd)}
                          className="p-1.5 text-gray-400 hover:text-[#003799] hover:bg-blue-50 rounded transition"
                          title="Modifier cette commande"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(cmd.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal Nouvelle Commande */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#003799]" />
                {editingCommande ? `Modifier la Commande : ${editingCommande.numero_commande}` : 'Créer une Nouvelle Commande'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCommande(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCommande} className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    N° Commande <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CMD-2026-001"
                    value={numCommande}
                    onChange={(e) => setNumCommande(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono font-bold text-[#003799] focus:outline-none focus:ring-2 focus:ring-[#003799]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Date Commande <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dateCommande}
                    onChange={(e) => setDateCommande(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003799]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Réf SAP (Optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SAP-45761005"
                    value={refSap}
                    onChange={(e) => setRefSap(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003799]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Fournisseur <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedFournisseur?.id || ''}
                    onChange={(e) => {
                      const found = suppliersList.find((s) => s.id === parseInt(e.target.value, 10));
                      setSelectedFournisseur(found || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003799]"
                  >
                    <option value="">Sélectionner un fournisseur...</option>
                    {suppliersList.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name} ({sup.code})
                      </option>
                    ))}
                  </select>
                </div>

                {editingCommande && (
                  <div className="md:col-span-4 pt-2 border-t border-gray-200">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Statut de la commande
                    </label>
                    <select
                      value={statutCommande}
                      onChange={(e) => setStatutCommande(e.target.value)}
                      className="w-full md:w-64 px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-[#003799] focus:outline-none focus:ring-2 focus:ring-[#003799] bg-white"
                    >
                      <option value="EN_COURS">En cours</option>
                      <option value="RECU_PARTIEL">Reçu partiel</option>
                      <option value="RECU_TOTAL">Reçu total</option>
                      <option value="ANNULE">Annulé</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Articles Lines Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#72D54A]" />
                      Lignes d’Articles de la Commande ({orderLines.length})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Sélectionnez les articles ou saisissez les codes et quantités commandées.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addLine}
                    className="px-3 py-1.5 bg-blue-50 text-[#003799] hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter un Article
                  </button>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200 uppercase">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3 w-48">Choisir Article Référentiel</th>
                        <th className="py-2.5 px-3 w-32">Code Article</th>
                        <th className="py-2.5 px-3">Désignation</th>
                        <th className="py-2.5 px-3 w-28">Quantité</th>
                        <th className="py-2.5 px-3 w-24">Unité</th>
                        <th className="py-2.5 px-3 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orderLines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 text-center font-bold text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={line.article_id || ''}
                              onChange={(e) => handleLineArticleSelect(idx, e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-[#003799]"
                            >
                              <option value="">(Saisie libre / Autre)</option>
                              {articlesList.map((art) => (
                                <option key={art.id} value={art.id}>
                                  {art.code} - {art.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              required
                              value={line.code_article}
                              onChange={(e) => handleLineChange(idx, 'code_article', e.target.value)}
                              placeholder="Code"
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-mono font-semibold text-[#003799]"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              required
                              value={line.designation_article}
                              onChange={(e) => handleLineChange(idx, 'designation_article', e.target.value)}
                              placeholder="Désignation"
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-medium"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              required
                              min="0.001"
                              step="any"
                              value={line.quantite_commandee}
                              onChange={(e) => handleLineChange(idx, 'quantite_commandee', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-mono font-bold text-right"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={line.unite_mesure}
                              onChange={(e) => handleLineChange(idx, 'unite_mesure', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-center"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded transition"
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

              {/* Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCommande(null);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#003799] hover:bg-[#002b77] text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : (editingCommande ? 'Enregistrer les modifications' : 'Créer la Commande')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails Commande */}
      {selectedCommande && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#003799]" />
                  Détails Commande : <span className="font-mono text-[#003799]">{selectedCommande.numero_commande}</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Fournisseur : <strong className="text-gray-800">{selectedCommande.fournisseur_nom}</strong> | Date : {new Date(selectedCommande.date_commande).toLocaleDateString('fr-FR')} {selectedCommande.ref_sap && `| SAP: ${selectedCommande.ref_sap}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedCommande(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                <span>Statut : <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">{selectedCommande.statut}</span></span>
                <span>Total lignes : <strong>{selectedCommande.lignes?.length || 0}</strong></span>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 uppercase">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Code Article</th>
                      <th className="py-2.5 px-3">Désignation</th>
                      <th className="py-2.5 px-3 text-right">Qté Commandée</th>
                      <th className="py-2.5 px-3 text-center">Unité</th>
                      <th className="py-2.5 px-3 text-right">Déjà Reçue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedCommande.lignes?.map((l) => (
                      <tr key={l.id || l.ligne_numero} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 text-center font-bold text-gray-400">
                          {l.ligne_numero}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#003799]">
                          {l.code_article}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">
                          {l.designation_article}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                          {l.quantite_commandee.toLocaleString('fr-FR')}
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-500">
                          {l.unite_mesure}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                          {(l.quantite_deja_recue || 0).toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = selectedCommande;
                    setSelectedCommande(null);
                    openEditModal(toEdit);
                  }}
                  className="px-4 py-2 bg-[#003799] hover:bg-[#002b77] text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier cette commande
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCommande(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Supprimer la commande</h3>
            <p className="text-sm text-gray-500">
              Êtes-vous certain de vouloir supprimer cette commande et toutes ses lignes ?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

