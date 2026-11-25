import React from 'react';
import { User } from '../types';
import { Users, UserPlus, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface UsersPageProps {
  users: User[];
  onAddUserClick: () => void;
  onEditUserClick: (u: User) => void;
  onDeleteUserClick: (id: number) => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({
  users,
  onAddUserClick,
  onEditUserClick,
  onDeleteUserClick
}) => {
  const roleDisplay = {
    appro: 'Approvisionnement',
    technique: 'Contrôle Technique',
    magasin: 'Magasinier',
    admin: 'Administrateur'
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#003799]" />
          <h2 className="text-sm font-bold text-slate-800">
            Gestion des Utilisateurs & Droits d'Accès
          </h2>
        </div>
        <button
          onClick={onAddUserClick}
          className="px-3 py-1.5 bg-[#003799] hover:bg-[#002566] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4 text-[#72D54A]" />
          <span>Nouvel Utilisateur</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="py-2.5 px-4 w-12 text-center">ID</th>
              <th className="py-2.5 px-4">Utilisateur / Login</th>
              <th className="py-2.5 px-4">Nom Complet</th>
              <th className="py-2.5 px-4">Rôle Métier</th>
              <th className="py-2.5 px-4">Email</th>
              <th className="py-2.5 px-4 w-28 text-center">Statut</th>
              <th className="py-2.5 px-4 w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 text-center font-bold text-slate-400">{u.id}</td>
                <td className="py-3 px-4 font-mono font-bold text-[#003799]">{u.username}</td>
                <td className="py-3 px-4 font-medium text-slate-800">{u.full_name}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-[#003799]">
                    {(roleDisplay as any)[u.role] || u.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600">{u.email || '--'}</td>
                <td className="py-3 px-4 text-center">
                  {u.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                      <XCircle className="w-3 h-3 text-rose-600" />
                      Inactif
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onEditUserClick(u)}
                      className="p-1 rounded text-slate-500 hover:text-[#003799] hover:bg-slate-100 transition-colors"
                      title="Modifier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => onDeleteUserClick(u.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

