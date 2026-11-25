"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseQrPayload = parseQrPayload;
exports.getCaissesByReception = getCaissesByReception;
exports.scanCaisse = scanCaisse;
exports.deleteCaisse = deleteCaisse;
exports.validerEntreeCaisses = validerEntreeCaisses;
const db_1 = require("../config/db");
function parseQrPayload(raw) {
    if (!raw || typeof raw !== 'string')
        return null;
    const clean = raw.trim();
    // 1. Try JSON format
    if (clean.startsWith('{') && clean.endsWith('}')) {
        try {
            const parsed = JSON.parse(clean);
            return {
                article_code: String(parsed.article || parsed.article_code || parsed.code || '').trim(),
                numero_lot_fournisseur: String(parsed.lot || parsed.numero_lot_fournisseur || parsed.lot_fournisseur || 'LOT-INCONNU').trim(),
                quantite: parseFloat(parsed.quantite || parsed.qty || parsed.qte) || 0,
                code_caisse: String(parsed.caisse || parsed.code_caisse || parsed.id || `CS-${Date.now()}`).trim()
            };
        }
        catch (e) {
            // fallback to delimiter
        }
    }
    // 2. Try delimiter format: ARTICLE;LOT;QUANTITY;CAISSE_ID (support ';' or '|')
    const delimiter = clean.includes(';') ? ';' : clean.includes('|') ? '|' : null;
    if (delimiter) {
        const parts = clean.split(delimiter).map(p => p.trim());
        if (parts.length >= 3) {
            return {
                article_code: parts[0],
                numero_lot_fournisseur: parts[1] || 'LOT-STANDARD',
                quantite: parseFloat(parts[2]) || 0,
                code_caisse: parts[3] || `CS-${Date.now().toString().slice(-4)}`
            };
        }
    }
    return null;
}
async function getCaissesByReception(req, res) {
    try {
        const bon_id = parseInt(req.params.id, 10);
        if (!bon_id) {
            return res.status(400).json({ success: false, error: 'ID bon invalide' });
        }
        const pool = await (0, db_1.getPool)();
        // Get scanned caisses
        const caissesRes = await pool.request()
            .input('bon_id', db_1.sql.Int, bon_id)
            .query(`
        SELECT c.*
        FROM Caisses c
        WHERE c.reception_id = @bon_id
        ORDER BY c.date_scan ASC, c.id ASC
      `);
        const caisses = caissesRes.recordset;
        // Grouping by Supplier Lot
        const lotsSummaryMap = {};
        let totalPieces = 0;
        for (const c of caisses) {
            const lot = c.numero_lot_fournisseur || 'SANS_LOT';
            if (!lotsSummaryMap[lot]) {
                lotsSummaryMap[lot] = {
                    lot,
                    nombre_caisses: 0,
                    quantite_totale: 0
                };
            }
            lotsSummaryMap[lot].nombre_caisses += 1;
            lotsSummaryMap[lot].quantite_totale += Number(c.quantite) || 0;
            totalPieces += Number(c.quantite) || 0;
        }
        const lotsSummary = Object.values(lotsSummaryMap);
        return res.json({
            success: true,
            bon_id,
            total_caisses: caisses.length,
            total_pieces: totalPieces,
            lots: lotsSummary,
            caisses
        });
    }
    catch (error) {
        console.error('Error in getCaissesByReception:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
async function scanCaisse(req, res) {
    try {
        const bon_id = parseInt(req.params.id, 10);
        const { qr_payload, scanne_par, manual_data } = req.body || {};
        const pool = await (0, db_1.getPool)();
        // 1. Fetch Reception info and lines
        const bonRes = await pool.request()
            .input('bon_id', db_1.sql.Int, bon_id)
            .query(`SELECT id, numero_reception, fournisseur, statut FROM BonsReception WHERE id = @bon_id`);
        const bon = bonRes.recordset[0];
        if (!bon) {
            return res.status(404).json({ success: false, error: 'Bon de réception non trouvé' });
        }
        const lignesRes = await pool.request()
            .input('bon_id', db_1.sql.Int, bon_id)
            .query(`SELECT id, ligne_numero, code_article, designation_article, quantite_attendue FROM BonReceptionLignes WHERE bon_reception_id = @bon_id`);
        const lignes = lignesRes.recordset;
        // 2. Parse payload or use manual data
        let parsed = manual_data || parseQrPayload(qr_payload);
        if (!parsed) {
            return res.status(400).json({
                success: false,
                error: `Format QR non reconnu. Format attendu : "CODE_ARTICLE;NUMERO_LOT;QUANTITE;NUM_CAISSE"`
            });
        }
        const { article_code, numero_lot_fournisseur, quantite, code_caisse } = parsed;
        if (!article_code || !numero_lot_fournisseur || !quantite) {
            return res.status(400).json({
                success: false,
                error: 'Données incomplètes : code article, lot fournisseur et quantité sont obligatoires.'
            });
        }
        // 3. Match article to a line in this reception
        const matchedLigne = lignes.find(l => l.code_article.trim().toUpperCase() === article_code.trim().toUpperCase());
        if (!matchedLigne) {
            return res.status(400).json({
                success: false,
                error: `L'article "${article_code}" ne correspond à aucune ligne de ce bon de réception.`
            });
        }
        // 4. Duplicate scan check
        const checkDup = await pool.request()
            .input('bon_id', db_1.sql.Int, bon_id)
            .input('code_caisse', db_1.sql.NVarChar, code_caisse)
            .query(`SELECT id, numero_lot_fournisseur FROM Caisses WHERE reception_id = @bon_id AND code_caisse = @code_caisse`);
        if (checkDup.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                duplicate: true,
                error: `La caisse "${code_caisse}" a déjà été scannée pour ce bon !`
            });
        }
        // 5. Insert Caisse
        await pool.request()
            .input('code_caisse', db_1.sql.NVarChar, code_caisse)
            .input('lot', db_1.sql.NVarChar, numero_lot_fournisseur)
            .input('reception_id', db_1.sql.Int, bon_id)
            .input('reception_ligne_id', db_1.sql.Int, matchedLigne.id)
            .input('num_rec', db_1.sql.NVarChar, bon.numero_reception)
            .input('art_code', db_1.sql.NVarChar, matchedLigne.code_article)
            .input('desig', db_1.sql.NVarChar, matchedLigne.designation_article || '')
            .input('fourn', db_1.sql.NVarChar, bon.fournisseur || '')
            .input('qty', db_1.sql.Decimal(18, 3), quantite)
            .input('scanne_par', db_1.sql.NVarChar, scanne_par || 'Magasinier')
            .input('qr_raw', db_1.sql.NVarChar, qr_payload || JSON.stringify(parsed))
            .query(`
        INSERT INTO Caisses (
          code_caisse, numero_lot_fournisseur, reception_id, reception_ligne_id,
          numero_reception, article_code, designation, fournisseur, quantite,
          statut, date_scan, scanne_par, code_qr_raw
        ) VALUES (
          @code_caisse, @lot, @reception_id, @reception_ligne_id,
          @num_rec, @art_code, @desig, @fourn, @qty,
          'DISPONIBLE', GETDATE(), @scanne_par, @qr_raw
        )
      `);
        // Return updated summary
        return getCaissesByReception(req, res);
    }
    catch (error) {
        console.error('Error in scanCaisse:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
async function deleteCaisse(req, res) {
    try {
        const caisse_id = parseInt(req.params.caisseId, 10);
        const bon_id = parseInt(req.params.id, 10);
        const pool = await (0, db_1.getPool)();
        await pool.request()
            .input('caisse_id', db_1.sql.Int, caisse_id)
            .input('bon_id', db_1.sql.Int, bon_id)
            .query(`DELETE FROM Caisses WHERE id = @caisse_id AND reception_id = @bon_id`);
        return getCaissesByReception(req, res);
    }
    catch (error) {
        console.error('Error in deleteCaisse:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
async function validerEntreeCaisses(req, res) {
    try {
        const bon_id = parseInt(req.params.id, 10);
        const { user_id, user_nom, remarques_magasin } = req.body || {};
        const pool = await (0, db_1.getPool)();
        // 1. Fetch Bon info
        const bonRes = await pool.request()
            .input('bon_id', db_1.sql.Int, bon_id)
            .query(`SELECT id, numero_reception, date_reception, statut FROM BonsReception WHERE id = @bon_id`);
        const bon = bonRes.recordset[0];
        if (!bon) {
            return res.status(404).json({ success: false, error: 'Bon non trouvé' });
        }
        // 2. Fetch all scanned caisses for this reception
        const caissesRes = await pool.request()
            .input('bon_id', db_1.sql.Int, bon_id)
            .query(`
        SELECT reception_ligne_id, numero_lot_fournisseur, COUNT(*) AS nb_caisses, SUM(quantite) AS qte_totale
        FROM Caisses
        WHERE reception_id = @bon_id
        GROUP BY reception_ligne_id, numero_lot_fournisseur
      `);
        const caissesGrouped = caissesRes.recordset;
        // 3. Fetch lines
        const lignesRes = await pool.request()
            .input('bon_id', db_1.sql.Int, bon_id)
            .query(`SELECT id, quantite_attendue FROM BonReceptionLignes WHERE bon_reception_id = @bon_id`);
        const lignes = lignesRes.recordset;
        let aDesEcarts = false;
        // Update each reception line with scanned totals
        for (const l of lignes) {
            const scannedForLine = caissesGrouped.filter(c => c.reception_ligne_id === l.id);
            const totalScannedQty = scannedForLine.reduce((sum, c) => sum + (Number(c.qte_totale) || 0), 0);
            const qteAttendue = Number(l.quantite_attendue) || 0;
            let statut_mag = 'CONFORME';
            if (Math.abs(totalScannedQty - qteAttendue) > 0.001) {
                statut_mag = 'ECART';
                aDesEcarts = true;
            }
            await pool.request()
                .input('bon_id', db_1.sql.Int, bon_id)
                .input('ligne_id', db_1.sql.Int, l.id)
                .input('qte_recue', db_1.sql.Decimal(18, 3), totalScannedQty)
                .input('statut_mag', db_1.sql.NVarChar, statut_mag)
                .input('user_id', db_1.sql.Int, user_id || 3)
                .query(`
          UPDATE BonReceptionLignes
          SET quantite_recue_magasin = @qte_recue,
              statut_magasin = @statut_mag,
              date_controle_magasin = GETDATE(),
              controleur_magasin_id = @user_id
          WHERE id = @ligne_id AND bon_reception_id = @bon_id
        `);
        }
        // 4. Update Bon Reception Status
        const dateRec = new Date(bon.date_reception);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - dateRec.getTime());
        const dureeTotale = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const decisionGlobale = aDesEcarts ? 'AVEC_ECART' : 'CONFORME';
        const statutFinal = aDesEcarts ? 'ECART_MAGASIN' : 'VALIDE_MAGASIN';
        await pool.request()
            .input('bon_id', db_1.sql.Int, bon_id)
            .input('decision', db_1.sql.NVarChar, decisionGlobale)
            .input('remarques', db_1.sql.NVarChar, remarques_magasin || null)
            .input('user_id', db_1.sql.Int, user_id || 3)
            .input('duree', db_1.sql.Int, dureeTotale)
            .input('statut', db_1.sql.NVarChar, statutFinal)
            .query(`
        UPDATE BonsReception
        SET decision_magasin = @decision,
            remarques_magasin = @remarques,
            date_validation_magasin = GETDATE(),
            valideur_magasin_id = @user_id,
            duree_jours_totale = @duree,
            statut = @statut
        WHERE id = @bon_id
      `);
        // 5. Audit History
        const auditDetails = `Pointage et Réception Caisses par scan QR (${decisionGlobale}). Clôturé par ${user_nom || 'Magasinier'}.`;
        await pool.request()
            .input('bon_id', db_1.sql.Int, bon_id)
            .input('details', db_1.sql.NVarChar, auditDetails)
            .input('user_id', db_1.sql.Int, user_id || 3)
            .input('user_nom', db_1.sql.NVarChar, user_nom || 'Magasinier Sensus')
            .query(`
        INSERT INTO HistoriqueTracabilite (bon_reception_id, action, details, effectue_par_id, effectue_par_nom, role_utilisateur)
        VALUES (@bon_id, 'SCAN_CAISSES_MAGASIN', @details, @user_id, @user_nom, 'magasin')
      `);
        return res.json({
            success: true,
            decision: decisionGlobale,
            statut: statutFinal,
            message: `Entrée magasin validée avec succès par scan des caisses (${decisionGlobale}).`
        });
    }
    catch (error) {
        console.error('Error in validerEntreeCaisses:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
