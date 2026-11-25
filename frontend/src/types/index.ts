export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'appro' | 'technique' | 'magasin' | 'admin';
  email?: string;
  is_active: boolean;
  created_at?: string;
  last_login?: string;
}

export interface BonItem {
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
  emplacement?: string;
  nombre_palettes?: number;
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
  lignes?: BonItem[];
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
  user_nom?: string;
}

export interface NotificationItem {
  id: number;
  titre: string;
  message: string;
  role_destinataire: string;
  bon_reception_id?: number;
  lu: boolean | number;
  date_creation: string;
}

export interface DashboardStats {
  total_bons: number;
  total_articles: number;
  en_attente_technique: number;
  en_attente_magasin: number;
  valide_magasin: number;
  non_conforme: number;
  duree_moyenne_jours: number;
}

export interface Article {
  id: number;
  code: string;
  name: string;
  unite_mesure?: string;
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

export interface PaletteItem {
  id: number;
  code_palette: string;
  reception_id: number;
  reception_ligne_id: number;
  numero_reception: string;
  article_code: string;
  designation?: string;
  fournisseur?: string;
  quantite: number;
  statut: 'DISPONIBLE' | 'SORTI_PRODUCTION' | 'REBUT';
  emplacement?: string;
  date_entree_magasin: string;
  date_sortie?: string;
  destination_ligne?: string;
  num_of?: string;
  operateur_magasin?: string;
  remarques?: string;
  code_qr_data?: string;
  jours_en_magasin?: number;
}

export interface CaisseItem {
  id: number;
  code_caisse: string;
  numero_lot_fournisseur: string;
  reception_id: number;
  reception_ligne_id: number;
  numero_reception: string;
  article_code: string;
  designation?: string;
  fournisseur?: string;
  quantite: number;
  statut: string;
  date_scan: string;
  scanne_par?: string;
  code_qr_raw?: string;
}

export interface LotSummaryItem {
  lot: string;
  nombre_caisses: number;
  quantite_totale: number;
}
