import { Router } from 'express';
import { login } from '../controllers/authController';
import {
  getReceptions,
  getReceptionById,
  createReception,
  updateReception,
  deleteReception,
  updateRemarques
} from '../controllers/receptionsController';
import {
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle
} from '../controllers/articlesController';
import {
  getFournisseurs,
  getFournisseurById,
  createFournisseur,
  updateFournisseur,
  deleteFournisseur
} from '../controllers/fournisseursController';
import {
  getCommandes,
  getCommandeById,
  createCommande,
  updateCommande,
  deleteCommande
} from '../controllers/commandesController';
import { submitTechnique } from '../controllers/techniqueController';
import { submitMagasin } from '../controllers/magasinController';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../controllers/notificationsController';
import {
  getPalettesDisponibles,
  getPalettesByReception,
  updatePalette
} from '../controllers/palettesController';
import {
  getCaissesByReception,
  scanCaisse,
  deleteCaisse,
  validerEntreeCaisses
} from '../controllers/caissesController';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/usersController';
import { getStats, exportExcel } from '../controllers/statsController';

const router = Router();

// Auth
router.post('/auth/login', login);

// Stats & Export
router.get('/stats', getStats);
router.get('/export', exportExcel);

// Articles
router.get('/articles', getArticles);
router.get('/articles/:id', getArticleById);
router.post('/articles', createArticle);
router.put('/articles/:id', updateArticle);
router.delete('/articles/:id', deleteArticle);

// Fournisseurs
router.get('/fournisseurs', getFournisseurs);
router.get('/fournisseurs/:id', getFournisseurById);
router.post('/fournisseurs', createFournisseur);
router.put('/fournisseurs/:id', updateFournisseur);
router.delete('/fournisseurs/:id', deleteFournisseur);

// Commandes
router.get('/commandes', getCommandes);
router.get('/commandes/:id', getCommandeById);
router.post('/commandes', createCommande);
router.put('/commandes/:id', updateCommande);
router.delete('/commandes/:id', deleteCommande);

// Receptions
router.get('/receptions', getReceptions);
router.get('/receptions/:id', getReceptionById);
router.post('/receptions', createReception);
router.put('/receptions/:id', updateReception);
router.delete('/receptions/:id', deleteReception);
router.post('/receptions/:id/technique', submitTechnique);
router.post('/receptions/:id/magasin', submitMagasin);
router.post('/receptions/:id/remarques', updateRemarques);

// Caisses Scanning (Pointage Magasin par Lot)
router.get('/receptions/:id/caisses', getCaissesByReception);
router.post('/receptions/:id/scan-caisse', scanCaisse);
router.delete('/receptions/:id/caisses/:caisseId', deleteCaisse);
router.post('/receptions/:id/valider-caisses', validerEntreeCaisses);

// Palettes (Disponible pour Sortie)
router.get('/palettes/disponibles', getPalettesDisponibles);
router.get('/palettes/reception/:id', getPalettesByReception);
router.put('/palettes/:id', updatePalette);

// Notifications
router.get('/notifications', getNotifications);
router.post('/notifications/:id/read', markNotificationRead);
router.post('/notifications/read-all', markAllNotificationsRead);

// Users Management (Admin)
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;
