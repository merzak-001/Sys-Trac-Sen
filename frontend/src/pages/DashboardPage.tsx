import React from 'react';
import { DashboardStats } from '../types';
import { Package, Microscope, Warehouse, CheckCircle2, AlertTriangle, Clock, Layers } from 'lucide-react';

interface DashboardPageProps {
  stats: DashboardStats | null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ stats }) => {
  if (!stats) return <div className="p-8 text-center text-xs text-slate-400">Chargement des indicateurs...</div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bons Réception</div>
            <div className="text-2xl font-black text-[#003799] mt-1">{stats.total_bons}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{stats.total_articles} articles enregistrés</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003799] flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Attente Contrôle Tech</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.en_attente_technique}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Étape 2 du cycle</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Microscope className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-purple-600 uppercase tracking-wider">Attente Magasin</div>
            <div className="text-2xl font-black text-purple-600 mt-1">{stats.en_attente_magasin}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Étape 3 du cycle</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Warehouse className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Validés & Clôturés</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.valide_magasin}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Cycle complété</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Secondary Row: Quality & Lead Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Durée Moyenne Contrôle Technique</div>
            <div className="text-3xl font-black text-[#003799] mt-2">
              {stats.duree_moyenne_jours} <span className="text-sm font-semibold text-slate-500">jour(s)</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Indicateur de réactivité Contrôle Technique (OS-Technique)</div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#003799] flex items-center justify-center">
            <Clock className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">Rejets & Non-Conformités</div>
            <div className="text-3xl font-black text-rose-600 mt-2">
              {stats.non_conforme} <span className="text-sm font-semibold text-slate-500">bon(s)</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Bloqués en contrôle technique pour non-conformité</div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
        </div>
      </div>
    </div>
  );
};

