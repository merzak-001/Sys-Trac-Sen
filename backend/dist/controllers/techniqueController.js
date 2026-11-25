"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitTechnique = submitTechnique;
const db_1 = require("../config/db");
async function submitTechnique(req, res) {
    try {
        const bon_id = parseInt(req.params.id, 10);
        const data = req.body || {};
        const decision_globale = String(data.decision_globale || data.decision || 'CONFORME').trim();
        const remarques_technique = String(data.remarques_technique || data.remarques || '').trim();
        const user_id = data.user_id || 2;
        const user_nom = data.user_nom || 'Responsable Contrôle Technique';
        const lignes_feedback = Array.isArray(data.lignes)
            ? data.lignes
            : Array.isArray(data.item_decisions)
                ? data.item_decisions
                : [];
        const pool = await (0, db_1.getPool)();
        // Check reception
        const bonRes = await pool.request()
            .input('bon_id', db_1.sql.Int, bon_id)
            .query(`SELECT id, numero_reception, date_reception FROM BonsReception WHERE id = @bon_id`);
        const bon = bonRes.recordset[0];
        if (!bon) {
            return res.status(404).json({ error: 'Bon non trouvé' });
        }
        // Calculate lead time in days
        const dateRec = new Date(bon.date_reception);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - dateRec.getTime());
        const dureeJours = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        // Status logic:
        // If NON_CONFORME -> statut = 'NON_CONFORME'
        // Else -> 'VALIDE_TECHNIQUE'
        const newStatut = decision_globale === 'NON_CONFORME' ? 'NON_CONFORME' : 'VALIDE_TECHNIQUE';
        await pool.request()
            .input('bon_id', db_1.sql.Int, bon_id)
            .input('decision', db_1.sql.NVarChar, decision_globale)
            .input('remarques', db_1.sql.NVarChar, remarques_technique)
            .input('user_id', db_1.sql.Int, user_id)
            .input('duree', db_1.sql.Int, dureeJours)
            .input('statut', db_1.sql.NVarChar, newStatut)
            .query(`
        UPDATE BonsReception
        SET decision_technique = @decision,
            remarques_technique = @remarques,
            date_validation_technique = GETDATE(),
            valideur_technique_id = @user_id,
            duree_jours_technique = @duree,
            statut = @statut
        WHERE id = @bon_id
      `);
        // Update lines feedback
        for (const lf of lignes_feedback) {
            const ligne_id = lf.id;
            const statut_ligne = String(lf.statut_technique || decision_globale);
            const rem_ligne = String(lf.remarques_technique || '');
            const defauts = parseInt(lf.defauts_trouves, 10) || 0;
            if (ligne_id) {
                await pool.request()
                    .input('bon_id', db_1.sql.Int, bon_id)
                    .input('ligne_id', db_1.sql.Int, ligne_id)
                    .input('statut', db_1.sql.NVarChar, statut_ligne)
                    .input('rem', db_1.sql.NVarChar, rem_ligne)
                    .input('defauts', db_1.sql.Int, defauts)
                    .input('user_id', db_1.sql.Int, user_id)
                    .query(`
            UPDATE BonReceptionLignes
            SET statut_technique = @statut,
                remarques_technique = @rem,
                defauts_trouves = @defauts,
                date_controle_technique = GETDATE(),
                controleur_technique_id = @user_id
            WHERE id = @ligne_id AND bon_reception_id = @bon_id
          `);
            }
        }
        // Audit History
        const auditDetails = `Contrôle Technique validé : ${decision_globale} (Délai : ${dureeJours} j). Observations : ${remarques_technique || 'Aucune'}`;
        await pool.request()
            .input('bon_id', db_1.sql.Int, bon_id)
            .input('details', db_1.sql.NVarChar, auditDetails)
            .input('user_id', db_1.sql.Int, user_id)
            .input('user_nom', db_1.sql.NVarChar, user_nom)
            .query(`
        INSERT INTO HistoriqueTracabilite (bon_reception_id, action, details, effectue_par_id, effectue_par_nom, role_utilisateur)
        VALUES (@bon_id, 'VALIDATION_TECHNIQUE', @details, @user_id, @user_nom, 'technique')
      `);
        // Real Notifications
        if (newStatut === 'VALIDE_TECHNIQUE') {
            await pool.request()
                .input('msg', db_1.sql.NVarChar, `Le bon N° ${bon.numero_reception} a été validé par le Contrôle Technique (${decision_globale}). Prêt pour vérification quantité Magasin.`)
                .input('bon_id', db_1.sql.Int, bon_id)
                .query(`
          INSERT INTO Notifications (titre, message, role_destinataire, bon_reception_id, lu, date_creation)
          VALUES ('Prêt pour Contrôle Magasin', @msg, 'magasin', @bon_id, 0, GETDATE())
        `);
        }
        else {
            await pool.request()
                .input('msg', db_1.sql.NVarChar, `ALERTE : Le bon N° ${bon.numero_reception} a été déclaré NON CONFORME par le Contrôle Technique. Action requise.`)
                .input('bon_id', db_1.sql.Int, bon_id)
                .query(`
          INSERT INTO Notifications (titre, message, role_destinataire, bon_reception_id, lu, date_creation)
          VALUES ('Alerte Non-Conformité Technique', @msg, 'appro', @bon_id, 0, GETDATE())
        `);
        }
        return res.json({
            success: true,
            decision: decision_globale,
            statut: newStatut,
            message: `Contrôle Technique validé avec succès (${decision_globale}). Transmis à l'étape suivante.`
        });
    }
    catch (err) {
        console.error('Error in submitTechnique:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
