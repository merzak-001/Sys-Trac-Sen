import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLogin?: (user: User) => void;
  onLoginSuccess?: (user: User) => void;
  showToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onLoginSuccess, showToast }) => {
  const [username, setUsername] = useState('appro');
  const [password, setPassword] = useState('appro123');
  const [loading, setLoading] = useState(false);

  const handleLoginCallback = onLogin || onLoginSuccess;

  const quickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success && data.user) {
        if (handleLoginCallback) {
          handleLoginCallback(data.user);
        } else {
          localStorage.setItem('sensus_user', JSON.stringify(data.user));
          window.location.reload();
        }
        showToast(`Bienvenue, ${data.user.full_name} !`, 'success');
      } else {
        showToast(data.error || 'Identifiant ou mot de passe incorrect.', 'danger');
      }
    } catch (err: any) {
      showToast('Erreur de connexion au serveur : ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#002566] via-[#003799] to-[#001740] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/20 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <img
            src="/assets/sensus-int-logo-blue&green-rgb.svg"
            alt="Sensus International"
            className="h-12 mx-auto object-contain mb-3"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-black text-[#003799] tracking-tight">
            SystemTracabilie
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Plateforme de Traçabilité des Réceptions Marchandises
          </p>
        </div>

        {/* Demo Fast Switcher */}
        <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
            Sélectionner un Profil Métier (Démo) :
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => quickFill('appro', 'appro123')}
              className="py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 font-semibold text-slate-700 transition-all text-left truncate flex items-center gap-1.5"
            >
              <span>📦</span> Appro
            </button>
            <button
              type="button"
              onClick={() => quickFill('technique', 'tech123')}
              className="py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 font-semibold text-slate-700 transition-all text-left truncate flex items-center gap-1.5"
            >
              <span>🔬</span> Technique
            </button>
            <button
              type="button"
              onClick={() => quickFill('magasin', 'mag123')}
              className="py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-300 font-semibold text-slate-700 transition-all text-left truncate flex items-center gap-1.5"
            >
              <span>🏭</span> Magasin
            </button>
            <button
              type="button"
              onClick={() => quickFill('admin', 'admin123')}
              className="py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 font-semibold text-slate-700 transition-all text-left truncate flex items-center gap-1.5"
            >
              <span>🛡️</span> Admin
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Identifiant</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: appro, technique, magasin, admin"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003799]/20 focus:border-[#003799] font-medium"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003799]/20 focus:border-[#003799] font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#003799] hover:bg-[#002566] text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Connexion...' : 'Se Connecter à Sensus'}</span>
            <ArrowRight className="w-4 h-4 text-[#72D54A]" />
          </button>
        </form>

        <div className="mt-6 text-center text-[11px] text-slate-400">
          Système Sécurisé Sensus International &bull; Xylem
        </div>
      </div>
    </div>
  );
};
