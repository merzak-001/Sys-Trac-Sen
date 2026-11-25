import React, { useState, useEffect } from 'react';
import { Article, User } from '../types';
import { api } from '../services/api';
import { Plus, Search, Edit2, Trash2, Package, RefreshCw, X, Check } from 'lucide-react';

interface ArticlesPageProps {
  currentUser: User;
  showToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const ArticlesPage: React.FC<ArticlesPageProps> = ({ showToast }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unite, setUnite] = useState('pce');
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const data = await api.getArticles(search);
      setArticles(data);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement des articles', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadArticles();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreateModal = () => {
    setEditingArticle(null);
    setCode('');
    setName('');
    setUnite('pce');
    setShowModal(true);
  };

  const openEditModal = (art: Article) => {
    setEditingArticle(art);
    setCode(art.code);
    setName(art.name);
    setUnite(art.unite_mesure || 'pce');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      showToast('Le code et le nom sont requis.', 'warning');
      return;
    }

    try {
      setSaving(true);
      if (editingArticle) {
        await api.updateArticle(editingArticle.id, {
          code: code.trim(),
          name: name.trim(),
          unite_mesure: unite.trim()
        });
        showToast(`Article "${code}" mis à jour avec succès.`, 'success');
      } else {
        await api.createArticle({
          code: code.trim(),
          name: name.trim(),
          unite_mesure: unite.trim()
        });
        showToast(`Article "${code}" créé avec succès.`, 'success');
      }
      setShowModal(false);
      loadArticles();
    } catch (err: any) {
      showToast(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteArticle(id);
      showToast('Article supprimé avec succès.', 'success');
      setDeletingId(null);
      loadArticles();
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
            <Package className="w-6 h-6 text-[#72D54A]" />
            Référentiel des Articles
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion de la base article : codes, dénominations et unités de mesure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadArticles}
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
            Nouvel Article
          </button>
        </div>
      </div>

      {/* Filter and stats */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Rechercher par code ou nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003799]"
          />
        </div>
        <div className="text-xs font-semibold text-gray-500">
          Total : <span className="text-[#003799] font-bold">{articles.length}</span> article(s)
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100 uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Code Article</th>
                <th className="py-3.5 px-4">Désignation (Nom)</th>
                <th className="py-3.5 px-4">Unité</th>
                <th className="py-3.5 px-4">Date Création</th>
                <th className="py-3.5 px-4">Date Mise à Jour</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && articles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Chargement des articles...
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Aucun article trouvé.
                  </td>
                </tr>
              ) : (
                articles.map((art) => (
                  <tr key={art.id} className="hover:bg-blue-50/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#003799]">
                      {art.code}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">
                      {art.name}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        {art.unite_mesure || 'pce'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {art.date_created ? new Date(art.date_created).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {art.date_updated ? new Date(art.date_updated).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(art)}
                          className="p-1.5 text-gray-400 hover:text-[#003799] hover:bg-blue-50 rounded transition"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(art.id)}
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#003799]" />
                {editingArticle ? 'Modifier l’Article' : 'Ajouter un Article'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Code Article <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 48115600 ou ART-101"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003799]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Désignation / Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tête laiton D25"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003799]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Unité de mesure
                </label>
                <select
                  value={unite}
                  onChange={(e) => setUnite(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003799]"
                >
                  <option value="pce">Pièce (pce)</option>
                  <option value="kg">Kilogramme (kg)</option>
                  <option value="m">Mètre (m)</option>
                  <option value="l">Litre (l)</option>
                  <option value="lot">Lot</option>
                  <option value="carton">Carton</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {saving ? 'Enregistrement...' : editingArticle ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Confirmer la suppression</h3>
            <p className="text-sm text-gray-500">
              Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible.
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

