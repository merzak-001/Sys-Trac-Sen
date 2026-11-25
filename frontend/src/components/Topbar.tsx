import React, { useState, useRef, useEffect } from 'react';
import { User, NotificationItem } from '../types';
import { Bell, Plus, Check, RefreshCw } from 'lucide-react';

interface TopbarProps {
  title: string;
  currentUser: User;
  onRoleSwitch: (role: 'appro' | 'technique' | 'magasin' | 'admin') => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onNotificationClick: (notif: NotificationItem) => void;
  onMarkAllNotificationsRead: () => void;
  onRefreshNotifications: () => void;
  onNewReceptionClick: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  currentUser,
  onRoleSwitch,
  notifications,
  unreadCount,
  onNotificationClick,
  onMarkAllNotificationsRead,
  onRefreshNotifications,
  onNewReceptionClick
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      {/* Left: View Title & Quick Role Switcher */}
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">
          {title}
        </h1>

        <div className="flex items-center gap-2 text-xs bg-slate-100 py-1 px-3 rounded-lg border border-slate-200">
          <span className="font-semibold text-slate-500">Rôle Actif :</span>
          <select
            value={currentUser.role}
            onChange={(e) => onRoleSwitch(e.target.value as any)}
            className="bg-transparent font-bold text-[#003799] focus:outline-none cursor-pointer"
          >
            <option value="appro">Approvisionnement</option>
            <option value="technique">Contrôle Technique</option>
            <option value="magasin">Magasinier</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>
      </div>

      {/* Right: Notifications & Create Reception */}
      <div className="flex items-center gap-4">
        {/* Notifications Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2 rounded-lg text-slate-600 hover:text-[#003799] hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
            title="Alertes de traçabilité"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in duration-150">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Alertes de Traçabilité ({unreadCount} non lue{unreadCount > 1 ? 's' : ''})
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    onClick={onMarkAllNotificationsRead}
                    className="text-[#003799] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Tout marquer lu
                  </button>
                  <button
                    onClick={onRefreshNotifications}
                    className="text-slate-500 hover:text-slate-700 p-0.5 rounded"
                    title="Actualiser"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Aucune alerte de traçabilité pour le moment.
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.lu || n.lu === 0;
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          onNotificationClick(n);
                          setDropdownOpen(false);
                        }}
                        className={`p-3 text-xs cursor-pointer transition-colors hover:bg-blue-50/60 ${
                          isUnread ? 'bg-blue-50/30' : 'bg-white opacity-70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-[#003799] shrink-0" />
                            )}
                            <span>{n.titre}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                            {n.date_creation ? new Date(n.date_creation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Create Reception Button (Appro and Admin) */}
        {(currentUser.role === 'appro' || currentUser.role === 'admin') && (
          <button
            onClick={onNewReceptionClick}
            className="px-4 py-2 bg-[#003799] hover:bg-[#002566] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#72D54A]" />
            <span>Créer Réception</span>
          </button>
        )}
      </div>
    </header>
  );
};
