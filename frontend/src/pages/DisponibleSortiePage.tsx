import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { PaletteItem, User } from '../types';
import { 
  Boxes, 
  Package, 
  CheckCircle2, 
  MapPin, 
  Search, 
  RefreshCw, 
  QrCode, 
  Truck, 
  Calendar, 
  Info, 
  X, 
  Building2,
  FileText,
  Clock,
  Layers,
  Edit2
} from 'lucide-react';

interface DisponibleSortiePageProps {
  currentUser: User;
}

export const DisponibleSortiePage: React.FC<DisponibleSortiePageProps> = ({ currentUser }) => {
  const [palettes, setPalettes] = useState<PaletteItem[]>([]);
  const [stats, setStats] = useState({
    total_palettes: 0,
    total_articles: 0,
    total_quantite: 0,
    total_emplacements: 0
  });
  const [emplacements, setEmplacements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedEmplacement, setSelectedEmplacement] = useState('');

  // Selected Palette for Details / QR Modal
  const [selectedPalette, setSelectedPalette] = useState<PaletteItem | null>(null);

  // Edit location state
  const [editingPalette, setEditingPalette] = useState<PaletteItem | null>(null);
  const [newEmplacement, setNewEmplacement] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  const fetchPalettes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPalettesDisponibles({
        search: search.trim() || undefined,
        emplacement: selectedEmplacement || undefined
      });
      if (res.success) {
        setPalettes(res.palettes || []);
        setStats(res.stats || {
          total_palettes: 0,
          total_articles: 0,
          total_quantite: 0,
          total_emplacements: 0
        });
        setEmplacements(res.emplacements || []);
      }
    } catch (err: any) {
      console.error('Error fetching palettes:', err);
      setError(err.message || 'Erreur lors du chargement des palettes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPalettes();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedEmplacement]);

  const handleSaveEmplacement = async () => {
    if (!editingPalette) return;
    try {
      setSavingLocation(true);
      await api.updatePalette(editingPalette.id, {
        emplacement: newEmplacement.trim() || 'Zone Magasin'
      });
      setEditingPalette(null);
      await fetchPalettes();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise à jour de l'emplacement");
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Explanation */}
      <div className="bg-gradient-to-r from-[#003799] to-[#002566] text-white rounded-2xl p-6 shadow-md border border-blue-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-white/10 text-[#72D54A]">
              <Boxes className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              Palettes Disponibles pour Sortie
            </h2>
          </div>
          <p className="text-blue-100 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
            Visualisez en temps réel toutes les palettes et unités de manutention contrôlées, conformes et prêtes à être transférées vers les lignes de production ou bancs d'assemblage.
          </p>
        </div>

        <button
          onClick={fetchPalettes}
          disabled={loading}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-white/20 transition shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-[#72D54A] ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-[#003799] rounded-xl">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 leading-tight">
              {stats.total_palettes}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Palettes Prêtes
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 leading-tight">
              {stats.total_articles}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Articles Référencés
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 leading-tight">
              {stats.total_quantite.toLocaleString('fr-FR')}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Pièces Disponibles
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 leading-tight">
              {stats.total_emplacements}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Emplacements Magasin
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Rechercher palette, code article, N° BR, fournisseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003799]/20 focus:border-[#003799] transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-600 w-full sm:w-auto">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedEmplacement}
              onChange={(e) => setSelectedEmplacement(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003799]/20 w-full sm:w-auto cursor-pointer"
            >
              <option value="">Tous les emplacements</option>
              {emplacements.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchPalettes} className="underline font-bold">
            Réessayer
          </button>
        </div>
      )}

      {/* Main Table View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#003799]" />
            <h3 className="text-sm font-bold text-slate-800">
              Liste des Palettes Prêtes pour Atelier ({palettes.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            FIFO Recommandé
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#003799]" />
            <span>Chargement des palettes prêtes...</span>
          </div>
        ) : palettes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <Boxes className="w-10 h-10 text-slate-300 stroke-[1.5]" />
            <p className="font-medium text-slate-600">Aucune palette disponible trouvée.</p>
            <p className="text-[11px] text-slate-400">
              Les palettes apparaîtront ici automatiquement dès que le Magasinier validera les réceptions conformes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Code Palette (QR)</th>
                  <th className="py-3 px-4">Article & Désignation</th>
                  <th className="py-3 px-4 text-right">Quantité</th>
                  <th className="py-3 px-4">Emplacement</th>
                  <th className="py-3 px-4">Bon Réception</th>
                  <th className="py-3 px-4">Fournisseur</th>
                  <th className="py-3 px-4">Délai / Date Entrée</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {palettes.map((p) => {
                  const daysInStore = p.jours_en_magasin ?? 0;
                  return (
                    <tr 
                      key={p.id} 
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Code Palette */}
                      <td className="py-3 px-4 font-mono font-bold text-[#003799] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#003799] transition-colors" />
                          <span>{p.code_palette}</span>
                        </div>
                      </td>

                      {/* Article & Designation */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {p.article_code}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1" title={p.designation}>
                          {p.designation || 'Sans désignation'}
                        </div>
                      </td>

                      {/* Quantite */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-sm text-slate-800">
                          {Number(p.quantite).toLocaleString('fr-FR')}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1">
                          pce
                        </span>
                      </td>

                      {/* Emplacement */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {p.emplacement || 'Zone Magasin'}
                          </span>
                          {(currentUser.role === 'magasin' || currentUser.role === 'admin') && (
                            <button
                              onClick={() => {
                                setEditingPalette(p);
                                setNewEmplacement(p.emplacement || 'Zone Magasin');
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#003799] transition-all"
                              title="Modifier l'emplacement"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Bon Réception */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-[#003799] border border-blue-200/50 font-mono text-[11px]">
                          {p.numero_reception}
                        </span>
                      </td>

                      {/* Fournisseur */}
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[150px]" title={p.fournisseur}>
                        {p.fournisseur || '-'}
                      </td>

                      {/* Date & Délai */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-700 font-medium">
                          {p.date_entree_magasin ? new Date(p.date_entree_magasin).toLocaleDateString('fr-FR') : '-'}
                        </div>
                        <div className="text-[10.5px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>
                            {daysInStore === 0 ? "Aujourd'hui" : `Il y a ${daysInStore} j`}
                          </span>
                        </div>
                      </td>

                      {/* Statut Pill */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Disponible pour Sortie
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedPalette(p)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-[#003799] hover:text-white text-slate-700 text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 border border-slate-200"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Fiche QR</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Palette Details / QR Modal */}
      {selectedPalette && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-[#003799] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#72D54A]" />
                <h3 className="font-bold text-base">
                  Fiche Traçabilité Palette
                </h3>
              </div>
              <button
                onClick={() => setSelectedPalette(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Top Banner with Sensus Branding */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Identifiant Palette (Handling Unit)
                  </div>
                  <div className="text-lg font-black font-mono text-[#003799] mt-0.5">
                    {selectedPalette.code_palette}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Disponible pour Sortie
                </span>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 font-medium">Code Article</div>
                  <div className="font-bold text-slate-800 mt-0.5 text-sm">
                    {selectedPalette.article_code}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 font-medium">Quantité sur Palette</div>
                  <div className="font-extrabold text-emerald-700 mt-0.5 text-sm">
                    {Number(selectedPalette.quantite).toLocaleString('fr-FR')} pièces
                  </div>
                </div>

                <div className="col-span-2 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 font-medium">Désignation Article</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {selectedPalette.designation || 'Sans désignation'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 font-medium">Bon de Réception</div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">
                    {selectedPalette.numero_reception}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 font-medium">Fournisseur</div>
                  <div className="font-semibold text-slate-800 mt-0.5 truncate">
                    {selectedPalette.fournisseur || '-'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 font-medium">Emplacement Magasin</div>
                  <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#003799]" />
                    {selectedPalette.emplacement || 'Zone Magasin'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 font-medium">Date Entrée Magasin</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {selectedPalette.date_entree_magasin
                      ? new Date(selectedPalette.date_entree_magasin).toLocaleDateString('fr-FR')
                      : '-'}
                  </div>
                </div>
              </div>

              {/* QR Payload Preview */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs">
                <div className="font-bold text-[#003799] flex items-center gap-1.5 mb-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Données Numériques Encodées pour Scanner :</span>
                </div>
                <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 break-all select-all">
                  {selectedPalette.code_qr_data || selectedPalette.code_palette}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedPalette(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Emplacement Modal */}
      {editingPalette && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#003799]" />
              <span>Changer l'Emplacement</span>
            </h3>

            <p className="text-xs text-slate-500">
              Modifier la zone ou l'allée/rack pour la palette{' '}
              <strong className="text-slate-700">{editingPalette.code_palette}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nouvel Emplacement Magasin
              </label>
              <input
                type="text"
                value={newEmplacement}
                onChange={(e) => setNewEmplacement(e.target.value)}
                placeholder="Ex: Rack A-04, Zone Tampon 2..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#003799]/20"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingPalette(null)}
                disabled={savingLocation}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEmplacement}
                disabled={savingLocation}
                className="px-4 py-2 bg-[#003799] hover:bg-[#002566] text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                {savingLocation ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

