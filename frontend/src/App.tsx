import React, { useState, useEffect, useCallback } from 'react';
import { User, BonReception, NotificationItem, DashboardStats, Commande } from './types';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Toast, ToastProps } from './components/Toast';
import { DetailModal } from './components/DetailModal';
import { TechniqueModal } from './components/TechniqueModal';
import { MagasinModal } from './components/MagasinModal';
import { UserModal } from './components/UserModal';
import { EditReceptionModal } from './components/EditReceptionModal';
import { CreateReceptionModal } from './components/CreateReceptionModal';
import { LoginPage } from './pages/LoginPage';
import { ReceptionsPage } from './pages/ReceptionsPage';
import { NewReceptionPage } from './pages/NewReceptionPage';
import { TechniqueQueuePage } from './pages/TechniqueQueuePage';
import { MagasinQueuePage } from './pages/MagasinQueuePage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { UsersPage } from './pages/UsersPage';
import { CommandesPage } from './pages/CommandesPage';
import { ArticlesPage } from './pages/ArticlesPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { DisponibleSortiePage } from './pages/DisponibleSortiePage';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sensus_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [currentView, setCurrentView] = useState<string>('receptions');
  const [receptions, setReceptions] = useState<BonReception[]>([]);
  const [techniqueQueue, setTechniqueQueue] = useState<BonReception[]>([]);
  const [magasinQueue, setMagasinQueue] = useState<BonReception[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [disponibleCount, setDisponibleCount] = useState<number>(0);

  // Commande state for pre-filling NewReceptionPage
  const [selectedCommandeForReception, setSelectedCommandeForReception] = useState<Commande | null>(null);

  // Filters for Main Table
  const [currentFilterTab, setCurrentFilterTab] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('TOUS');
  const [supplierFilter, setSupplierFilter] = useState<string>('TOUS');

  // Modals state
  const [selectedBonDetail, setSelectedBonDetail] = useState<BonReception | null>(null);
  const [bonForTechniqueModal, setBonForTechniqueModal] = useState<BonReception | null>(null);
  const [bonForMagasinModal, setBonForMagasinModal] = useState<BonReception | null>(null);
  const [bonToEdit, setBonToEdit] = useState<BonReception | null>(null);
  const [createReceptionModalOpen, setCreateReceptionModalOpen] = useState<boolean>(false);
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<Array<Omit<ToastProps, 'onClose'>>>([]);

  const showToast = useCallback((message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load Data
  const loadReceptions = useCallback(async () => {
    if (!currentUser) return;
    try {
      const list = await api.getReceptions({
        search,
        statut: statusFilter,
        fournisseur: supplierFilter,
        filter_tab: currentFilterTab,
        user_role: currentUser.role
      });
      setReceptions(list);
    } catch (e) {
      console.error('Error in loadReceptions:', e);
    }
  }, [currentUser, search, statusFilter, supplierFilter, currentFilterTab]);

  const loadQueues = useCallback(async () => {
    try {
      const [techList, magList] = await Promise.all([
        api.getReceptions({ role_view: 'technique' }),
        api.getReceptions({ role_view: 'magasin' })
      ]);
      setTechniqueQueue(techList);
      setMagasinQueue(magList);
    } catch (e) {
      console.error('Error in loadQueues:', e);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await api.getNotifications(currentUser.role);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (e) {
      console.error('Error in loadNotifications:', e);
    }
  }, [currentUser]);

  const loadSuppliersAndStats = useCallback(async () => {
    try {
      const [sList, st, palRes] = await Promise.all([
        api.getSuppliers(),
        api.getStats(),
        api.getPalettesDisponibles().catch(() => ({ success: false, stats: { total_palettes: 0 } }))
      ]);
      setSuppliers(sList || []);
      setStats(st || null);
      if (palRes && palRes.stats) {
        setDisponibleCount(palRes.stats.total_palettes || 0);
      }
    } catch (e) {
      console.error('Error in loadSuppliersAndStats:', e);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const u = await api.getUsers();
      setUsersList(u);
    } catch (e) {
      console.error('Error in loadUsers:', e);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadReceptions();
      loadQueues();
      loadNotifications();
      loadSuppliersAndStats();
      loadUsers();
    }
  }, [currentUser, loadReceptions, loadQueues, loadNotifications, loadSuppliersAndStats, loadUsers]);

  // Polling notifications every 30s
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser, loadNotifications]);

  // Handlers
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('sensus_user', JSON.stringify(user));
    showToast(`Bienvenue, ${user.full_name} (${user.role.toUpperCase()})`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sensus_user');
    setCurrentView('receptions');
    showToast('Vous avez été déconnecté.', 'info');
  };

  const defaultRoleProfiles: Record<string, { id: number; username: string; full_name: string }> = {
    appro: { id: 1, username: 'appro', full_name: 'Agent Approvisionnement' },
    technique: { id: 2, username: 'technique', full_name: 'Responsable Contrôle Technique' },
    magasin: { id: 3, username: 'magasin', full_name: 'Gestionnaire Magasin' },
    admin: { id: 4, username: 'admin', full_name: 'Administrateur Système Sensus' }
  };

  const handleRoleSwitch = (newRole: 'appro' | 'technique' | 'magasin' | 'admin') => {
    if (!currentUser) return;
    const matched = usersList.find((u) => u.role === newRole && u.is_active) || defaultRoleProfiles[newRole];
    const updated: User = {
      id: matched?.id ?? defaultRoleProfiles[newRole].id,
      username: matched?.username ?? defaultRoleProfiles[newRole].username,
      role: newRole,
      full_name: matched?.full_name ?? defaultRoleProfiles[newRole].full_name,
      is_active: true
    };
    setCurrentUser(updated);
    localStorage.setItem('sensus_user', JSON.stringify(updated));

    // Redirect view if currently on a role-restricted screen
    setCurrentView((prev) => {
      if (prev === 'queue_technique' && newRole === 'magasin') return 'queue_magasin';
      if (prev === 'queue_magasin' && newRole === 'technique') return 'queue_technique';
      if (prev === 'queue_technique' && newRole !== 'technique' && newRole !== 'admin') return 'receptions';
      if (prev === 'queue_magasin' && newRole !== 'magasin' && newRole !== 'admin') return 'receptions';
      if (prev === 'new_reception' && newRole !== 'appro' && newRole !== 'admin') {
        return newRole === 'technique' ? 'queue_technique' : newRole === 'magasin' ? 'queue_magasin' : 'receptions';
      }
      if (prev === 'users' && newRole !== 'admin') return 'receptions';
      return prev;
    });

    showToast(`Rôle basculé vers : ${newRole.toUpperCase()} (${updated.full_name})`, 'info');
  };

  const handleRowClick = async (bon: BonReception) => {
    try {
      const full = await api.getReceptionById(bon.id);
      setSelectedBonDetail(full);
    } catch (e) {
      setSelectedBonDetail(bon);
    }
  };

  const handleTechniqueSubmit = async (bonId: number, data: any) => {
    if (!currentUser) return;
    try {
      await api.submitTechnique(bonId, {
        ...data,
        user_id: currentUser.id,
        user_nom: currentUser.full_name
      });
      showToast(`Contrôle technique validé avec succès (${data.decision_globale || data.decision || 'CONFORME'})`, 'success');
      setBonForTechniqueModal(null);
      loadReceptions();
      loadQueues();
      loadNotifications();
      loadSuppliersAndStats();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du contrôle technique', 'danger');
    }
  };

  const handleMagasinSubmit = async (bonId: number, data: any) => {
    if (!currentUser) return;
    try {
      await api.submitMagasin(bonId, {
        ...data,
        user_id: currentUser.id,
        user_nom: currentUser.full_name
      });
      showToast(`Validation magasin enregistrée (${data.decision || 'CONFORME'})`, 'success');
      setBonForMagasinModal(null);
      loadReceptions();
      loadQueues();
      loadNotifications();
      loadSuppliersAndStats();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la validation magasin', 'danger');
    }
  };

  const handleUserSubmit = async (userData: any) => {
    try {
      if (userToEdit) {
        await api.updateUser(userToEdit.id, userData);
        showToast(`Utilisateur ${userData.username} mis à jour avec succès`, 'success');
      } else {
        await api.createUser(userData);
        showToast(`Utilisateur ${userData.username} créé avec succès`, 'success');
      }
      setUserModalOpen(false);
      setUserToEdit(null);
      loadUsers();
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await api.deleteUser(id);
      showToast('Utilisateur supprimé avec succès', 'success');
      loadUsers();
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      await api.markNotificationRead(notif.id);
      loadNotifications();
      if (notif.bon_reception_id) {
        const full = await api.getReceptionById(notif.bon_reception_id);
        setSelectedBonDetail(full);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      await api.markAllNotificationsRead(currentUser.role);
      loadNotifications();
      showToast('Toutes les notifications sont marquées comme lues', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportExcel = () => {
    window.open('/api/export', '_blank');
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} onLoginSuccess={handleLogin} showToast={showToast} />;
  }

  const viewTitles: Record<string, string> = {
    receptions: 'Suivi des Réceptions de Marchandises',
    disponible_sortie: 'Palettes Disponibles pour Sortie (Atelier / Production)',
    new_reception: 'Créer un Bon de Réception',
    queue_technique: 'File de Validation : Contrôle Technique',
    queue_magasin: 'File de Réception : Magasin & Stockage',
    dashboard: 'Tableau de Bord & Indicateurs Qualité',
    history: 'Historique Complet & Piste d’Audit',
    users: 'Gestion des Utilisateurs & Rôles',
    commandes: 'Gestion des Commandes Fournisseurs',
    articles: 'Référentiel des Articles',
    fournisseurs: 'Répertoire des Fournisseurs'
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased overflow-hidden">
      {/* 1. Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onViewChange={(v) => {
          if (v !== 'new_reception') {
            setSelectedCommandeForReception(null);
          }
          setCurrentView(v);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        totalBonsCount={receptions.length}
        techQueueCount={techniqueQueue.length}
        magQueueCount={magasinQueue.length}
        disponibleCount={disponibleCount}
        onExportExcel={handleExportExcel}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar
          title={viewTitles[currentView] || 'SystemTracabilie'}
          currentUser={currentUser}
          onRoleSwitch={handleRoleSwitch}
          notifications={notifications}
          unreadCount={unreadCount}
          onNotificationClick={handleNotificationClick}
          onMarkAllNotificationsRead={handleMarkAllRead}
          onRefreshNotifications={loadNotifications}
          onNewReceptionClick={() => {
            setSelectedCommandeForReception(null);
            setCreateReceptionModalOpen(true);
          }}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === 'receptions' && (
            <ReceptionsPage
              receptions={receptions}
              currentUser={currentUser}
              suppliers={suppliers}
              currentFilterTab={currentFilterTab}
              onFilterTabChange={(tab) => {
                setCurrentFilterTab(tab);
                loadReceptions();
              }}
              search={search}
              onSearchChange={(val) => {
                setSearch(val);
                loadReceptions();
              }}
              statusFilter={statusFilter}
              onStatusFilterChange={(val) => {
                setStatusFilter(val);
                loadReceptions();
              }}
              supplierFilter={supplierFilter}
              onSupplierFilterChange={(val) => {
                setSupplierFilter(val);
                loadReceptions();
              }}
              onExportExcel={handleExportExcel}
              onRowClick={handleRowClick}
              onOpenTechniqueModal={(b) => setBonForTechniqueModal(b)}
              onOpenMagasinModal={(b) => setBonForMagasinModal(b)}
              onEditReception={(b) => setBonToEdit(b)}
              onOpenCreateModal={() => {
                setSelectedCommandeForReception(null);
                setCreateReceptionModalOpen(true);
              }}
            />
          )}

          {currentView === 'disponible_sortie' && (
            <DisponibleSortiePage
              currentUser={currentUser}
            />
          )}

          {currentView === 'new_reception' && (
            <ReceptionsPage
              receptions={receptions}
              currentUser={currentUser}
              suppliers={suppliers}
              currentFilterTab={currentFilterTab}
              onFilterTabChange={(tab) => {
                setCurrentFilterTab(tab);
                loadReceptions();
              }}
              search={search}
              onSearchChange={(val) => {
                setSearch(val);
                loadReceptions();
              }}
              statusFilter={statusFilter}
              onStatusFilterChange={(val) => {
                setStatusFilter(val);
                loadReceptions();
              }}
              supplierFilter={supplierFilter}
              onSupplierFilterChange={(val) => {
                setSupplierFilter(val);
                loadReceptions();
              }}
              onExportExcel={handleExportExcel}
              onRowClick={handleRowClick}
              onOpenTechniqueModal={(b) => setBonForTechniqueModal(b)}
              onOpenMagasinModal={(b) => setBonForMagasinModal(b)}
              onEditReception={(b) => setBonToEdit(b)}
              onOpenCreateModal={() => {
                setSelectedCommandeForReception(null);
                setCreateReceptionModalOpen(true);
              }}
            />
          )}

          {currentView === 'commandes' && (
            <CommandesPage
              currentUser={currentUser}
              showToast={showToast}
              onNavigateToNewReception={(cmd) => {
                setSelectedCommandeForReception(cmd);
                setCreateReceptionModalOpen(true);
              }}
            />
          )}

          {currentView === 'articles' && (
            <ArticlesPage
              currentUser={currentUser}
              showToast={showToast}
            />
          )}

          {currentView === 'fournisseurs' && (
            <SuppliersPage
              currentUser={currentUser}
              showToast={showToast}
            />
          )}

          {currentView === 'queue_technique' && (
            <TechniqueQueuePage
              queue={techniqueQueue}
              currentUser={currentUser}
              onOpenTechniqueModal={(b) => setBonForTechniqueModal(b)}
              onRowClick={handleRowClick}
            />
          )}

          {currentView === 'queue_magasin' && (
            <MagasinQueuePage
              queue={magasinQueue}
              currentUser={currentUser}
              onOpenMagasinModal={(b) => setBonForMagasinModal(b)}
              onRowClick={handleRowClick}
            />
          )}

          {currentView === 'dashboard' && <DashboardPage stats={stats} />}

          {currentView === 'history' && (
            <HistoryPage receptions={receptions} onRowClick={handleRowClick} />
          )}

          {currentView === 'users' && currentUser.role === 'admin' && (
            <UsersPage
              users={usersList}
              onAddUserClick={() => {
                setUserToEdit(null);
                setUserModalOpen(true);
              }}
              onEditUserClick={(u) => {
                setUserToEdit(u);
                setUserModalOpen(true);
              }}
              onDeleteUserClick={handleDeleteUser}
            />
          )}
        </main>
      </div>

      {/* 3. Global Modals */}
      <DetailModal
        bon={selectedBonDetail}
        currentUser={currentUser}
        onClose={() => setSelectedBonDetail(null)}
        onOpenTechniqueModal={(b) => setBonForTechniqueModal(b)}
        onOpenMagasinModal={(b) => setBonForMagasinModal(b)}
        onEditReception={(b) => setBonToEdit(b)}
      />

      {bonToEdit && (
        <EditReceptionModal
          bon={bonToEdit}
          currentUser={currentUser}
          onClose={() => setBonToEdit(null)}
          onSuccess={() => {
            loadReceptions();
            loadQueues();
            loadSuppliersAndStats();
            if (selectedBonDetail && selectedBonDetail.id === bonToEdit.id) {
              api.getReceptionById(bonToEdit.id).then((fresh) => setSelectedBonDetail(fresh)).catch(() => { });
            }
          }}
          showToast={showToast}
        />
      )}

      {createReceptionModalOpen && (
        <CreateReceptionModal
          currentUser={currentUser}
          initialCommande={selectedCommandeForReception}
          onClose={() => {
            setCreateReceptionModalOpen(false);
            setSelectedCommandeForReception(null);
          }}
          onSuccess={() => {
            setCreateReceptionModalOpen(false);
            setSelectedCommandeForReception(null);
            setCurrentFilterTab('all');
            loadReceptions();
            loadQueues();
            loadSuppliersAndStats();
          }}
          showToast={showToast}
        />
      )}

      <TechniqueModal
        bon={bonForTechniqueModal}
        currentUser={currentUser}
        onClose={() => setBonForTechniqueModal(null)}
        onSubmit={handleTechniqueSubmit}
      />

      <MagasinModal
        bon={bonForMagasinModal}
        currentUser={currentUser}
        onClose={() => setBonForMagasinModal(null)}
        onSubmit={handleMagasinSubmit}
      />

      {userModalOpen && (
        <UserModal
          userToEdit={userToEdit}
          onClose={() => {
            setUserModalOpen(false);
            setUserToEdit(null);
          }}
          onSubmit={handleUserSubmit}
        />
      )}

      {/* 4. Toast Notifications Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast {...t} onClose={removeToast} />
          </div>
        ))}
      </div>
    </div>
  );
};
