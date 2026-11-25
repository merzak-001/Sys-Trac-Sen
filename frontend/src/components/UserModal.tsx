import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, UserPlus, UserCheck } from 'lucide-react';

interface UserModalProps {
  userToEdit: User | null;
  onClose: () => void;
  onSubmit: (userData: any, id?: number) => Promise<void>;
}

export const UserModal: React.FC<UserModalProps> = ({
  userToEdit,
  onClose,
  onSubmit
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'appro' | 'technique' | 'magasin' | 'admin'>('appro');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setUsername(userToEdit.username);
      setPassword('');
      setFullName(userToEdit.full_name);
      setRole(userToEdit.role);
      setEmail(userToEdit.email || '');
      setIsActive(userToEdit.is_active);
    } else {
      setUsername('');
      setPassword('');
      setFullName('');
      setRole('appro');
      setEmail('');
      setIsActive(true);
    }
  }, [userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(
        {
          username,
          password: password || undefined,
          full_name: fullName,
          role,
          email,
          is_active: isActive
        },
        userToEdit ? userToEdit.id : undefined
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {userToEdit ? <UserCheck className="w-5 h-5 text-[#003799]" /> : <UserPlus className="w-5 h-5 text-[#003799]" />}
            <h3 className="font-bold text-sm text-slate-800">
              {userToEdit ? "Modifier l'utilisateur" : "Nouvel Utilisateur"}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Identifiant (Nom d'utilisateur) *</label>
            <input
              type="text"
              required
              disabled={!!userToEdit}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: j.dupont"
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-[#003799] disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Nom Complet & Prénom *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Jean Dupont"
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-[#003799]"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Rôle Métier (Profil) *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white font-medium focus:outline-none focus:border-[#003799]"
            >
              <option value="appro">📦 Approvisionnement</option>
              <option value="technique">🔬 Contrôle Technique</option>
              <option value="magasin">🏬 Magasinier</option>
              <option value="admin">🛡️ Administrateur</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: j.dupont@sensus.com"
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-[#003799]"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Mot de passe {userToEdit ? '(Laisser vide pour ne pas modifier)' : '*'}
            </label>
            <input
              type="password"
              required={!userToEdit}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-[#003799]"
            />
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-[#003799] rounded"
              />
              Compte Actif (autorisé à se connecter)
            </label>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#003799] hover:bg-[#002566] text-white rounded-lg font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

