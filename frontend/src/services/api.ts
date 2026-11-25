import { User, BonReception, NotificationItem, DashboardStats, Article, Fournisseur, Commande, PaletteItem, CaisseItem, LotSummaryItem } from '../types';

const BASE_URL = '/api';

async function parseResponse<T = any>(res: Response, defaultError = 'Erreur serveur'): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `${defaultError} (Code ${res.status})`);
    }
    return data as T;
  }

  const text = await res.text();
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        `Route API non trouvée (404). Si vous êtes sur le serveur, veuillez redémarrer le service PM2 via REDEMARRER_TOUT.bat.`
      );
    }
    const clean = text.replace(/<[^>]*>/g, '').trim().slice(0, 150);
    throw new Error(clean || `${defaultError} (${res.status} ${res.statusText})`);
  }
  return text as unknown as T;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return parseResponse(res, 'Erreur de connexion');
  },

  // Stats & Suppliers
  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${BASE_URL}/stats`);
    return parseResponse(res, 'Erreur lors du chargement des statistiques');
  },

  async getSuppliers(): Promise<string[]> {
    const res = await fetch(`${BASE_URL}/fournisseurs?format=simple`);
    const data = await parseResponse<any>(res, 'Erreur lors du chargement des fournisseurs');
    if (Array.isArray(data)) {
      if (typeof data[0] === 'string') return data;
      return data.map((d: any) => d.name || d.code);
    }
    return [];
  },

  // Articles API
  async getArticles(search?: string): Promise<Article[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${BASE_URL}/articles${query}`);
    return parseResponse(res, 'Erreur lors du chargement des articles');
  },

  async getArticleById(id: number): Promise<Article> {
    const res = await fetch(`${BASE_URL}/articles/${id}`);
    return parseResponse(res, 'Erreur lors du chargement de l’article');
  },

  async createArticle(data: { code: string; name: string; unite_mesure?: string }): Promise<Article> {
    const res = await fetch(`${BASE_URL}/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la création de l’article');
  },

  async updateArticle(id: number, data: { code: string; name: string; unite_mesure?: string }): Promise<Article> {
    const res = await fetch(`${BASE_URL}/articles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la mise à jour de l’article');
  },

  async deleteArticle(id: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/articles/${id}`, { method: 'DELETE' });
    return parseResponse(res, 'Erreur lors de la suppression de l’article');
  },

  // Fournisseurs API
  async getFournisseurs(search?: string): Promise<Fournisseur[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${BASE_URL}/fournisseurs${query}`);
    return parseResponse(res, 'Erreur lors du chargement des fournisseurs');
  },

  async getFournisseurById(id: number): Promise<Fournisseur> {
    const res = await fetch(`${BASE_URL}/fournisseurs/${id}`);
    return parseResponse(res, 'Erreur lors du chargement du fournisseur');
  },

  async createFournisseur(data: { code: string; name: string }): Promise<Fournisseur> {
    const res = await fetch(`${BASE_URL}/fournisseurs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la création du fournisseur');
  },

  async updateFournisseur(id: number, data: { code: string; name: string }): Promise<Fournisseur> {
    const res = await fetch(`${BASE_URL}/fournisseurs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la mise à jour du fournisseur');
  },

  async deleteFournisseur(id: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/fournisseurs/${id}`, { method: 'DELETE' });
    return parseResponse(res, 'Erreur lors de la suppression du fournisseur');
  },

  // Commandes API
  async getCommandes(search?: string, statut?: string): Promise<Commande[]> {
    const query = new URLSearchParams();
    if (search) query.append('search', search);
    if (statut && statut !== 'TOUS') query.append('statut', statut);
    const res = await fetch(`${BASE_URL}/commandes?${query.toString()}`);
    return parseResponse(res, 'Erreur lors du chargement des commandes');
  },

  async getCommandeById(id: number): Promise<Commande> {
    const res = await fetch(`${BASE_URL}/commandes/${id}`);
    return parseResponse(res, 'Erreur lors du chargement de la commande');
  },

  async createCommande(data: any): Promise<any> {
    const res = await fetch(`${BASE_URL}/commandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la création de la commande');
  },

  async updateCommande(id: number, data: any): Promise<any> {
    const res = await fetch(`${BASE_URL}/commandes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la mise à jour de la commande');
  },

  async deleteCommande(id: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/commandes/${id}`, { method: 'DELETE' });
    return parseResponse(res, 'Erreur lors de la suppression de la commande');
  },

  // Receptions
  async getReceptions(params: {
    search?: string;
    statut?: string;
    fournisseur?: string;
    filter_tab?: string;
    user_role?: string;
    role_view?: string;
  }): Promise<BonReception[]> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.statut) query.append('statut', params.statut);
    if (params.fournisseur) query.append('fournisseur', params.fournisseur);
    if (params.filter_tab) query.append('filter_tab', params.filter_tab);
    if (params.user_role) query.append('user_role', params.user_role);
    if (params.role_view) query.append('role_view', params.role_view);

    const res = await fetch(`${BASE_URL}/receptions?${query.toString()}`);
    return parseResponse(res, 'Erreur lors du chargement des réceptions');
  },

  async getReceptionById(id: number): Promise<BonReception> {
    const res = await fetch(`${BASE_URL}/receptions/${id}`);
    return parseResponse(res, 'Erreur lors du chargement de la réception');
  },

  async createReception(data: any): Promise<any> {
    const res = await fetch(`${BASE_URL}/receptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la création du bon de réception');
  },

  async updateReception(id: number, data: any): Promise<any> {
    const res = await fetch(`${BASE_URL}/receptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la mise à jour du bon de réception');
  },

  async deleteReception(id: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/receptions/${id}`, {
      method: 'DELETE'
    });
    return parseResponse(res, 'Erreur lors de la suppression du bon de réception');
  },

  async submitTechnique(id: number, data: any): Promise<any> {
    const res = await fetch(`${BASE_URL}/receptions/${id}/technique`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la validation technique');
  },

  async submitMagasin(id: number, data: any): Promise<any> {
    const res = await fetch(`${BASE_URL}/receptions/${id}/magasin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la validation magasin');
  },

  async updateRemarques(id: number, data: any): Promise<any> {
    const res = await fetch(`${BASE_URL}/receptions/${id}/remarques`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la mise à jour des remarques');
  },

  // Palettes (Disponible pour Sortie)
  async getPalettesDisponibles(params?: { search?: string; emplacement?: string; article?: string }): Promise<{
    success: boolean;
    palettes: PaletteItem[];
    stats: {
      total_palettes: number;
      total_articles: number;
      total_quantite: number;
      total_emplacements: number;
    };
    emplacements: string[];
  }> {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.emplacement) q.append('emplacement', params.emplacement);
    if (params?.article) q.append('article', params.article);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    const res = await fetch(`${BASE_URL}/palettes/disponibles${queryString}`);
    return parseResponse(res, 'Erreur lors du chargement des palettes disponibles');
  },

  async getPalettesByReception(receptionId: number): Promise<{ success: boolean; palettes: PaletteItem[] }> {
    const res = await fetch(`${BASE_URL}/palettes/reception/${receptionId}`);
    return parseResponse(res, 'Erreur lors du chargement des palettes');
  },

  async updatePalette(id: number, data: { emplacement?: string; remarques?: string }): Promise<any> {
    const res = await fetch(`${BASE_URL}/palettes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la mise à jour de la palette');
  },

  // Caisses (Pointage Magasin par Lot)
  async getCaissesByReception(bonId: number): Promise<{
    success: boolean;
    bon_id: number;
    total_caisses: number;
    total_pieces: number;
    lots: LotSummaryItem[];
    caisses: CaisseItem[];
  }> {
    const res = await fetch(`${BASE_URL}/receptions/${bonId}/caisses`);
    return parseResponse(res, 'Erreur lors du chargement des caisses');
  },

  async scanCaisse(bonId: number, data: { qr_payload?: string; scanne_par?: string; manual_data?: any }): Promise<any> {
    const res = await fetch(`${BASE_URL}/receptions/${bonId}/scan-caisse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors du scan de la caisse');
  },

  async deleteCaisse(bonId: number, caisseId: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/receptions/${bonId}/caisses/${caisseId}`, {
      method: 'DELETE'
    });
    return parseResponse(res, 'Erreur lors de la suppression de la caisse');
  },

  async validerEntreeCaisses(bonId: number, data: { user_id?: number; user_nom?: string; remarques_magasin?: string }): Promise<any> {
    const res = await fetch(`${BASE_URL}/receptions/${bonId}/valider-caisses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la validation finale des caisses');
  },

  // Notifications
  async getNotifications(role: string): Promise<{ notifications: NotificationItem[]; unread_count: number }> {
    const res = await fetch(`${BASE_URL}/notifications?role=${encodeURIComponent(role)}`);
    return parseResponse(res, 'Erreur lors du chargement des notifications');
  },

  async markNotificationRead(id: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/notifications/${id}/read`, { method: 'POST' });
    return parseResponse(res, 'Erreur lors de la mise à jour de la notification');
  },

  async markAllNotificationsRead(role: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    return parseResponse(res, 'Erreur lors de la mise à jour des notifications');
  },

  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${BASE_URL}/users`);
    return parseResponse(res, 'Erreur lors du chargement des utilisateurs');
  },

  async createUser(data: any): Promise<any> {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la création de l’utilisateur');
  },

  async updateUser(id: number, data: any): Promise<any> {
    const res = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res, 'Erreur lors de la mise à jour de l’utilisateur');
  },

  async deleteUser(id: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/users/${id}`, { method: 'DELETE' });
    return parseResponse(res, 'Erreur lors de la suppression de l’utilisateur');
  }
};
