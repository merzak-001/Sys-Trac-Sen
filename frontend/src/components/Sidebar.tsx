import React from 'react';
import { User } from '../types';
import { 
  Package, 
  BarChart3, 
  PlusCircle, 
  Microscope, 
  Warehouse, 
  Users, 
  History, 
  FileSpreadsheet, 
  LogOut,
  ShoppingCart,
  Truck,
  Boxes
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  currentUser: User;
  onLogout: () => void;
  totalBonsCount: number;
  techQueueCount: number;
  magQueueCount: number;
  disponibleCount?: number;
  onExportExcel: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  currentUser,
  onLogout,
  totalBonsCount,
  techQueueCount,
  magQueueCount,
  disponibleCount,
  onExportExcel
}) => {
  const role = currentUser.role;

  const roleDisplay = {
    appro: 'Approvisionnement',
    technique: 'Contrôle Technique',
    magasin: 'Gestionnaire Magasin',
    admin: 'Administrateur'
  }[role] || role;

  const cleanFullName = React.useMemo(() => {
    let name = currentUser.full_name || '';
    name = name
      .replace(/ContrÃ´le/gi, 'Contrôle')
      .replace(/SystÃ¨me/gi, 'Système')
      .replace(/Ã©/g, 'é')
      .replace(/Ã¨/g, 'è')
      .replace(/Ã/g, 'à');
    return name;
  }, [currentUser.full_name]);

  return (
    <aside className="w-64 bg-[#003799] text-white flex flex-col justify-between flex-shrink-0 h-screen sticky top-0 shadow-xl select-none z-20">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-blue-800/60 flex flex-col items-center text-center">
          <img 
            src="/assets/sensus-int-logo-white&green-rgb.svg" 
            alt="Sensus" 
            className="h-10 w-auto object-contain mb-2.5"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="font-bold text-sm tracking-wide text-white leading-tight">
            Système de Traçabilité
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[#72D54A] font-semibold mt-1">
            Sensus International
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-170px)]">
          {/* Main Navigation */}
          <div>
            <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider px-3 mb-1.5">
              Navigation
            </div>
            <div className="space-y-1">
              <button
                onClick={() => onViewChange('receptions')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  currentView === 'receptions'
                    ? 'bg-white/15 text-white font-semibold shadow-inner'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-[#72D54A]" />
                  <span>Bons de Réception</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 border border-blue-700/50">
                  {totalBonsCount}
                </span>
              </button>

              <button
                onClick={() => onViewChange('disponible_sortie')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  currentView === 'disponible_sortie'
                    ? 'bg-white/15 text-white font-semibold shadow-inner'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Boxes className="w-4 h-4 text-[#72D54A]" />
                  <span>Disponible pour Sortie</span>
                </div>
                {typeof disponibleCount === 'number' && disponibleCount > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#72D54A] text-[#002566] font-bold">
                    {disponibleCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onViewChange('dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  currentView === 'dashboard'
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-blue-300" />
                <span>Dashboard & KPIs</span>
              </button>
            </div>
          </div>

          {/* Workflow Operations */}
          <div>
            <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider px-3 mb-1.5">
              Opérations du Cycle
            </div>
            <div className="space-y-1">
              {(role === 'appro' || role === 'admin') && (
                <button
                  onClick={() => onViewChange('new_reception')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    currentView === 'new_reception'
                      ? 'bg-[#72D54A] text-[#002566] font-bold shadow-md'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <PlusCircle className={`w-4 h-4 ${currentView === 'new_reception' ? 'text-[#002566]' : 'text-[#72D54A]'}`} />
                  <span>Créer Réception (Appro)</span>
                </button>
              )}

              {(role === 'technique' || role === 'admin') && (
                <button
                  onClick={() => onViewChange('queue_technique')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    currentView === 'queue_technique'
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Microscope className="w-4 h-4 text-amber-300" />
                    <span>File Contrôle Tech.</span>
                  </div>
                  {techQueueCount > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                      {techQueueCount}
                    </span>
                  )}
                </button>
              )}

              {(role === 'magasin' || role === 'admin') && (
                <button
                  onClick={() => onViewChange('queue_magasin')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    currentView === 'queue_magasin'
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Warehouse className="w-4 h-4 text-purple-300" />
                    <span>File Contrôle Magasin</span>
                  </div>
                  {magQueueCount > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500 text-white font-bold">
                      {magQueueCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Commandes & Référentiels */}
          <div>
            <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider px-3 mb-1.5">
              Commandes & Articles
            </div>
            <div className="space-y-1">
              <button
                onClick={() => onViewChange('commandes')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  currentView === 'commandes'
                    ? 'bg-white/15 text-white font-semibold shadow-inner'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4 text-[#72D54A]" />
                <span>Commandes</span>
              </button>

              <button
                onClick={() => onViewChange('articles')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  currentView === 'articles'
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4 text-blue-300" />
                <span>Articles</span>
              </button>

              <button
                onClick={() => onViewChange('fournisseurs')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  currentView === 'fournisseurs'
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Truck className="w-4 h-4 text-emerald-300" />
                <span>Fournisseurs</span>
              </button>
            </div>
          </div>

          {/* Admin Management */}
          {role === 'admin' && (
            <div>
              <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider px-3 mb-1.5">
                Administration
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => onViewChange('users')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    currentView === 'users'
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4 text-blue-300" />
                  <span>Gestion Utilisateurs</span>
                </button>
              </div>
            </div>
          )}

          {/* Audit & Export */}
          <div>
            <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider px-3 mb-1.5">
              Audit & Rapports
            </div>
            <div className="space-y-1">
              <button
                onClick={() => onViewChange('history')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  currentView === 'history'
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <History className="w-4 h-4 text-slate-300" />
                <span>Historique d'Audit</span>
              </button>

              <button
                onClick={onExportExcel}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-all text-left"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#72D54A]" />
                <span>Exporter Excel (2026)</span>
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-blue-800/80 bg-blue-950/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#72D54A] text-[#002566] font-bold text-xs flex items-center justify-center flex-shrink-0">
              {cleanFullName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-[12.5px] font-semibold text-white truncate" title={cleanFullName}>
                {cleanFullName}
              </div>
              <div className="text-[11px] text-blue-200 truncate" title={roleDisplay}>
                {roleDisplay}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Déconnexion"
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/15 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
