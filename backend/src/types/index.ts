export interface User {
  id: number;
  username: string;
  password_hash?: string;
  full_name: string;
  role: 'appro' | 'technique' | 'magasin' | 'admin';
  email?: string;
  is_active: boolean;
  created_at?: string;
  last_login?: string;
}

export interface BonReceptionItem {
  id?: number;
  bon_reception_id?: number;
  ligne_numero: number;
  code_article: string;
  designation_article: string;
  numero_commande?: string;
  numero_commande_sap?: string;
  quantite_attendue: number;
  unite_mesure: string;
  statut_technique?: 'EN_ATTENTE' | 'CONFORME' | 'NON_CONFORME' | 'RESERVE';
  remarques_technique?: string;
  defauts_trouves?: number;
  date_controle_technique?: string;
  controleur_technique_id?: number;
  controleur_technique_nom?: string;
  quantite_recue_magasin?: number | null;
  statut_magasin?: 'EN_ATTENTE' | 'CONFORME' | 'ECART' | 'REFUSE';
  remarques_magasin?: string;
  date_controle_magasin?: string;
  controleur_magasin_id?: number;
  controleur_magasin_nom?: string;
}

export interface BonReception {
  id: number;
  numero_reception: string;
  fournisseur: string;
  date_reception: string;
  date_creation: string;
  statut: 'EN_ATTENTE_TECHNIQUE' | 'EN_COURS_TECHNIQUE' | 'VALIDE_TECHNIQUE' | 'VALIDE_MAGASIN' | 'NON_CONFORME' | 'ECART_MAGASIN';
  cree_par_id?: number;
  cree_par_nom?: string;
  remarques_appro?: string;
  date_validation_technique?: string;
  valideur_technique_id?: number;
  valideur_technique_nom?: string;
  decision_technique?: 'CONFORME' | 'NON_CONFORME' | 'AVEC_RESERVE';
  remarques_technique?: string;
  duree_jours_technique?: number;
  date_validation_magasin?: string;
  valideur_magasin_id?: number;
  valideur_magasin_nom?: string;
  decision_magasin?: 'CONFORME' | 'AVEC_ECART' | 'REFUSE';
  remarques_magasin?: string;
  duree_jours_totale?: number;
  total_lignes?: number;
  quantite_totale?: number;
  quantite_magasin_totale?: number;
  total_defauts?: number;
  sample_items?: Array<{
    code_article: string;
    designation_article: string;
    quantite_attendue: number;
    unite_mesure: string;
  }>;
  lignes?: BonReceptionItem[];
  historique?: HistoriqueItem[];
}

export interface HistoriqueItem {
  id: number;
  bon_reception_id: number;
  action: string;
  details?: string;
  effectue_par_id?: number;
  effectue_par_nom?: string;
  role_utilisateur?: string;
  timestamp: string;
}

export interface NotificationItem {
  id: number;
  titre: string;
  message: string;
  role_destinataire: string;
  bon_reception_id?: number;
  lu: boolean;
  date_creation: string;
}

export interface Article {
  id: number;
  code: string;
  name: string;
  unite_mesure: string;
  date_created: string;
  date_updated: string;
}

export interface Fournisseur {
  id: number;
  code: string;
  name: string;
  date_created: string;
  date_updated: string;
}

export interface LigneCommande {
  id?: number;
  commande_id?: number;
  ligne_numero: number;
  article_id?: number | null;
  code_article: string;
  designation_article: string;
  quantite_commandee: number;
  unite_mesure: string;
  quantite_deja_recue?: number;
}

export interface Commande {
  id: number;
  numero_commande: string;
  date_commande: string;
  ref_sap?: string;
  fournisseur_id?: number | null;
  fournisseur_nom: string;
  statut: 'EN_COURS' | 'RECU_PARTIEL' | 'RECU_TOTAL' | 'ANNULE';
  date_created: string;
  date_updated: string;
  total_lignes?: number;
  quantite_totale?: number;
  lignes?: LigneCommande[];
}
