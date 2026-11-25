import React, { useState, useEffect } from 'react';
import { Fournisseur, User } from '../types';
import { api } from '../services/api';
import { Plus, Search, Edit2, Trash2, Truck, RefreshCw, X, Check } from 'lucide-react';

interface SuppliersPageProps {
  currentUser: User;
  showToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({ showToast }) => {
  const [suppliers, setSuppliers] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Fournisseur | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.getFournisseurs(search);
      setSuppliers(data);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement des fournisseurs', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuppliers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setCode('');
    setName('');
    setShowModal(true);
  };

  const openEditModal = (sup: Fournisseur) => {
    setEditingSupplier(sup);
    setCode(sup.code);
    setName(sup.name);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      showToast('Le code et la raison sociale sont requis.', 'warning');
      return;
    }

    try {
      setSaving(true);
      if (editingSupplier) {
        await api.updateFournisseur(editingSupplier.id, {
          code: code.trim(),
          name: name.trim()
        });
        showToast(`Fournisseur "${name}" mis à jour.`, 'success');
      } else {
        await api.createFournisseur({
          code: code.trim(),
          name: name.trim()
        });
        showToast(`Fournisseur "${name}" créé avec succès.`, 'success');
      }
      setShowModal(false);
      loadSuppliers();
    } catch (err: any) {
      showToast(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteFournisseur(id);
      showToast('Fournisseur supprimé avec succès.', 'success');
      setDeletingId(null);
      loadSuppliers();
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
            <Truck className="w-6 h-6 text-[#72D54A]" />
            Répertoire des Fournisseurs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion des partenaires fournisseurs : codes comptables et raisons sociales.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadSuppliers}
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
            Nouveau Fournisseur
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
          Total : <span className="text-[#003799] font-bold">{suppliers.length}</span> fournisseur(s)
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100 uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Code Fournisseur</th>
                <th className="py-3.5 px-4">Raison Sociale / Nom</th>
                <th className="py-3.5 px-4">Date Création</th>
                <th className="py-3.5 px-4">Date Mise à Jour</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Chargement des fournisseurs...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Aucun fournisseur enregistré.
                  </td>
                </tr>
              ) : (
                suppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-blue-50/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#003799]">
                      {sup.code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      {sup.name}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {sup.date_created ? new Date(sup.date_created).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {sup.date_updated ? new Date(sup.date_updated).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(sup)}
                          className="p-1.5 text-gray-400 hover:text-[#003799] hover:bg-blue-50 rounded transition"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(sup.id)}
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
                <Truck className="w-4 h-4 text-[#003799]" />
                {editingSupplier ? 'Modifier le Fournisseur' : 'Ajouter un Fournisseur'}
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
                  Code Fournisseur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: F001 ou SLR"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#003799]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Raison Sociale / Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: SLR INDUSTRIE SAS"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003799]"
                />
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
                  {saving ? 'Enregistrement...' : editingSupplier ? 'Mettre à jour' : 'Enregistrer'}
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
              Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cette action est irréversible.
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

