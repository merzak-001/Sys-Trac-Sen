"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const receptionsController_1 = require("../controllers/receptionsController");
const articlesController_1 = require("../controllers/articlesController");
const fournisseursController_1 = require("../controllers/fournisseursController");
const commandesController_1 = require("../controllers/commandesController");
const techniqueController_1 = require("../controllers/techniqueController");
const magasinController_1 = require("../controllers/magasinController");
const notificationsController_1 = require("../controllers/notificationsController");
const palettesController_1 = require("../controllers/palettesController");
const caissesController_1 = require("../controllers/caissesController");
const usersController_1 = require("../controllers/usersController");
const statsController_1 = require("../controllers/statsController");
const router = (0, express_1.Router)();
// Auth
router.post('/auth/login', authController_1.login);
// Stats & Export
router.get('/stats', statsController_1.getStats);
router.get('/export', statsController_1.exportExcel);
// Articles
router.get('/articles', articlesController_1.getArticles);
router.get('/articles/:id', articlesController_1.getArticleById);
router.post('/articles', articlesController_1.createArticle);
router.put('/articles/:id', articlesController_1.updateArticle);
router.delete('/articles/:id', articlesController_1.deleteArticle);
// Fournisseurs
router.get('/fournisseurs', fournisseursController_1.getFournisseurs);
router.get('/fournisseurs/:id', fournisseursController_1.getFournisseurById);
router.post('/fournisseurs', fournisseursController_1.createFournisseur);
router.put('/fournisseurs/:id', fournisseursController_1.updateFournisseur);
router.delete('/fournisseurs/:id', fournisseursController_1.deleteFournisseur);
// Commandes
router.get('/commandes', commandesController_1.getCommandes);
router.get('/commandes/:id', commandesController_1.getCommandeById);
router.post('/commandes', commandesController_1.createCommande);
router.put('/commandes/:id', commandesController_1.updateCommande);
router.delete('/commandes/:id', commandesController_1.deleteCommande);
// Receptions
router.get('/receptions', receptionsController_1.getReceptions);
router.get('/receptions/:id', receptionsController_1.getReceptionById);
router.post('/receptions', receptionsController_1.createReception);
router.put('/receptions/:id', receptionsController_1.updateReception);
router.delete('/receptions/:id', receptionsController_1.deleteReception);
router.post('/receptions/:id/technique', techniqueController_1.submitTechnique);
router.post('/receptions/:id/magasin', magasinController_1.submitMagasin);
router.post('/receptions/:id/remarques', receptionsController_1.updateRemarques);
// Caisses Scanning (Pointage Magasin par Lot)
router.get('/receptions/:id/caisses', caissesController_1.getCaissesByReception);
router.post('/receptions/:id/scan-caisse', caissesController_1.scanCaisse);
router.delete('/receptions/:id/caisses/:caisseId', caissesController_1.deleteCaisse);
router.post('/receptions/:id/valider-caisses', caissesController_1.validerEntreeCaisses);
// Palettes (Disponible pour Sortie)
router.get('/palettes/disponibles', palettesController_1.getPalettesDisponibles);
router.get('/palettes/reception/:id', palettesController_1.getPalettesByReception);
router.put('/palettes/:id', palettesController_1.updatePalette);
// Notifications
router.get('/notifications', notificationsController_1.getNotifications);
router.post('/notifications/:id/read', notificationsController_1.markNotificationRead);
router.post('/notifications/read-all', notificationsController_1.markAllNotificationsRead);
// Users Management (Admin)
router.get('/users', usersController_1.getUsers);
router.post('/users', usersController_1.createUser);
router.put('/users/:id', usersController_1.updateUser);
router.delete('/users/:id', usersController_1.deleteUser);
exports.default = router;
