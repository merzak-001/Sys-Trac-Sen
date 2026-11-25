"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = getStats;
exports.exportExcel = exportExcel;
const db_1 = require("../config/db");
const XLSX = __importStar(require("xlsx"));
async function getStats(req, res) {
    try {
        const pool = await (0, db_1.getPool)();
        const [totalBonsRes, attenteTechRes, attenteMagRes, valideMagRes, nonConformeRes, avgDureeRes, totalArticlesRes] = await Promise.all([
            pool.request().query(`SELECT COUNT(*) AS total FROM BonsReception`),
            pool.request().query(`SELECT COUNT(*) AS total FROM BonsReception WHERE statut IN ('EN_ATTENTE_TECHNIQUE', 'EN_COURS_TECHNIQUE')`),
            pool.request().query(`SELECT COUNT(*) AS total FROM BonsReception WHERE statut = 'VALIDE_TECHNIQUE'`),
            pool.request().query(`SELECT COUNT(*) AS total FROM BonsReception WHERE statut = 'VALIDE_MAGASIN'`),
            pool.request().query(`SELECT COUNT(*) AS total FROM BonsReception WHERE statut = 'NON_CONFORME'`),
            pool.request().query(`SELECT AVG(CAST(duree_jours_technique AS FLOAT)) AS avg_dur FROM BonsReception WHERE duree_jours_technique IS NOT NULL`),
            pool.request().query(`SELECT COUNT(*) AS total FROM BonReceptionLignes`)
        ]);
        const avgDuree = avgDureeRes.recordset[0]?.avg_dur;
        return res.json({
            total_bons: totalBonsRes.recordset[0]?.total || 0,
            total_articles: totalArticlesRes.recordset[0]?.total || 0,
            en_attente_technique: attenteTechRes.recordset[0]?.total || 0,
            en_attente_magasin: attenteMagRes.recordset[0]?.total || 0,
            valide_magasin: valideMagRes.recordset[0]?.total || 0,
            non_conforme: nonConformeRes.recordset[0]?.total || 0,
            duree_moyenne_jours: avgDuree ? Math.round(avgDuree * 10) / 10 : 0.0
        });
    }
    catch (err) {
        console.error('Error in getStats:', err);
        return res.status(500).json({ error: err.message });
    }
}
async function exportExcel(req, res) {
    try {
        const pool = await (0, db_1.getPool)();
        const result = await pool.request().query(`
      SELECT 
        b.numero_reception AS [N° Bon Réception],
        CONVERT(VARCHAR(10), b.date_reception, 120) AS [Date Réception],
        b.fournisseur AS [Fournisseur],
        l.code_article AS [Code Article],
        l.designation_article AS [Désignation Article],
        l.numero_commande AS [N° Commande],
        l.numero_commande_sap AS [N° Commande SAP],
        l.quantite_attendue AS [Quantité Attendue],
        l.unite_mesure AS [Unité],
        b.statut AS [Statut Cycle],
        b.decision_technique AS [Avis Contrôle Technique],
        l.defauts_trouves AS [Défauts Constatés],
        b.remarques_technique AS [Observations Contrôle Technique],
        b.duree_jours_technique AS [Durée Contrôle (Jours)],
        l.quantite_recue_magasin AS [Quantité Reçue Magasin],
        b.decision_magasin AS [Avis Magasinier],
        b.remarques_magasin AS [Remarques Magasin],
        b.duree_jours_totale AS [Durée Totale Cycle (Jours)],
        b.remarques_appro AS [Observations Approvisionnement]
      FROM BonsReception b
      LEFT JOIN BonReceptionLignes l ON l.bon_reception_id = b.id
      ORDER BY b.id DESC, l.ligne_numero ASC
    `);
        const data = result.recordset;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Réactivité Réceptions 2026');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="Reactivite_Bons_Receptions_2026.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.send(buffer);
    }
    catch (err) {
        console.error('Error in exportExcel:', err);
        return res.status(500).json({ error: err.message });
    }
}
