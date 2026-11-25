import { Request, Response } from 'express';
import { getPool, sql } from '../config/db';

export async function submitMagasin(req: Request, res: Response) {
  try {
    const bon_id = parseInt(req.params.id, 10);
    const data = req.body || {};
    const remarques_magasin = String(data.remarques_magasin || data.remarques || '').trim();
    const user_id = data.user_id || 3;
    const user_nom = data.user_nom || 'Gestionnaire Magasin';
    const lignes_reception = Array.isArray(data.lignes)
      ? data.lignes
      : Array.isArray(data.item_receptions)
      ? data.item_receptions
      : [];

    const pool = await getPool();

    const bonRes = await pool.request()
      .input('bon_id', sql.Int, bon_id)
      .query(`SELECT id, numero_reception, date_reception FROM BonsReception WHERE id = @bon_id`);
    const bon = bonRes.recordset[0];
    if (!bon) {
      return res.status(404).json({ error: 'Bon non trouvé' });
    }

    let aDesEcarts = false;
    const initialDecision = data.decision ? String(data.decision) : '';

    // Update lines received quantities & packaging/palettes
    for (const lr of lignes_reception) {
      const ligne_id = lr.id;
      const qte_recue = parseFloat(lr.quantite_recue_magasin);
      const rem_mag = String(lr.remarques_magasin || '');
      const emplacement = String(lr.emplacement || '').trim() || 'Zone Magasin';
      const nb_palettes = Math.max(1, parseInt(lr.nombre_palettes, 10) || 1);

      if (ligne_id) {
        const ligneInfoRes = await pool.request()
          .input('bon_id', sql.Int, bon_id)
          .input('ligne_id', sql.Int, ligne_id)
          .query(`SELECT code_article, designation_article, numero_commande, quantite_attendue FROM BonReceptionLignes WHERE id = @ligne_id AND bon_reception_id = @bon_id`);

        const ligneDB = ligneInfoRes.recordset[0];
        const qteAttendue = ligneDB?.quantite_attendue || 0;
        let statut_mag = 'CONFORME';

        if (!isNaN(qte_recue) && Math.abs(qte_recue - qteAttendue) > 0.001) {
          statut_mag = 'ECART';
          aDesEcarts = true;
        }

        const finalQteRecue = isNaN(qte_recue) ? qteAttendue : qte_recue;

        await pool.request()
          .input('bon_id', sql.Int, bon_id)
          .input('ligne_id', sql.Int, ligne_id)
          .input('qte_recue', sql.Decimal(18, 3), finalQteRecue)
          .input('statut_mag', sql.NVarChar, statut_mag)
          .input('rem_mag', sql.NVarChar, rem_mag)
          .input('emplacement', sql.NVarChar, emplacement)
          .input('nb_palettes', sql.Int, nb_palettes)
          .input('user_id', sql.Int, user_id)
          .query(`
            UPDATE BonReceptionLignes
            SET quantite_recue_magasin = @qte_recue,
                statut_magasin = @statut_mag,
                remarques_magasin = @rem_mag,
                emplacement = @emplacement,
                nombre_palettes = @nb_palettes,
                date_controle_magasin = GETDATE(),
                controleur_magasin_id = @user_id
            WHERE id = @ligne_id AND bon_reception_id = @bon_id
          `);

        // Generate Palettes for this line if received quantity > 0
        if (finalQteRecue > 0 && initialDecision !== 'REFUSE') {
          // Remove previous pallets for this line if re-validating
          await pool.request()
            .input('ligne_id', sql.Int, ligne_id)
            .query(`DELETE FROM Palettes WHERE reception_ligne_id = @ligne_id AND statut = 'DISPONIBLE'`);

          const qtePerPallet = Math.floor((finalQteRecue / nb_palettes) * 1000) / 1000;
          let qteRemaining = finalQteRecue;

          for (let pIdx = 1; pIdx <= nb_palettes; pIdx++) {
            const thisPalletQty = (pIdx === nb_palettes) ? qteRemaining : qtePerPallet;
            qteRemaining -= thisPalletQty;

            const yearStr = new Date().getFullYear();
            const codePalette = `PAL-${yearStr}-${String(bon_id).padStart(4, '0')}-${String(ligne_id).padStart(4, '0')}-${String(pIdx).padStart(2, '0')}`;
            const qrData = JSON.stringify({
              code: codePalette,
              br: bon.numero_reception,
              article: ligneDB?.code_article || 'N/A',
              designation: ligneDB?.designation_article || 'N/A',
              quantite: thisPalletQty,
              date: new Date().toISOString().split('T')[0],
              emplacement: emplacement
            });

            await pool.request()
              .input('code_palette', sql.NVarChar, codePalette)
              .input('reception_id', sql.Int, bon_id)
              .input('reception_ligne_id', sql.Int, ligne_id)
              .input('num_rec', sql.NVarChar, bon.numero_reception)
              .input('art_code', sql.NVarChar, ligneDB?.code_article || 'N/A')
              .input('desig', sql.NVarChar, ligneDB?.designation_article || 'N/A')
              .input('fourn', sql.NVarChar, bon.fournisseur || '')
              .input('qty', sql.Decimal(18, 3), thisPalletQty)
              .input('emp', sql.NVarChar, emplacement)
              .input('op_mag', sql.NVarChar, user_nom)
              .input('rem', sql.NVarChar, rem_mag || null)
              .input('qr_data', sql.NVarChar, qrData)
              .query(`
                INSERT INTO Palettes (
                  code_palette, reception_id, reception_ligne_id, numero_reception,
                  article_code, designation, fournisseur, quantite, statut,
                  emplacement, date_entree_magasin, operateur_magasin, remarques, code_qr_data
                ) VALUES (
                  @code_palette, @reception_id, @reception_ligne_id, @num_rec,
                  @art_code, @desig, @fourn, @qty, 'DISPONIBLE',
                  @emp, GETDATE(), @op_mag, @rem, @qr_data
                )
              `);
          }
        }

        // Update corresponding LignesCommande if linked to a commande
        if (ligneDB?.numero_commande && ligneDB?.code_article) {
          await pool.request()
            .input('num_cmd', sql.NVarChar, ligneDB.numero_commande)
            .input('code_art', sql.NVarChar, ligneDB.code_article)
            .input('qte_recue', sql.Decimal(18, 3), finalQteRecue)
            .query(`
              UPDATE LignesCommande
              SET quantite_deja_recue = ISNULL(quantite_deja_recue, 0) + @qte_recue
              WHERE code_article = @code_art 
                AND commande_id = (SELECT TOP 1 id FROM Commandes WHERE numero_commande = @num_cmd)
            `);
        }
      }
    }

    const dateRec = new Date(bon.date_reception);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - dateRec.getTime());
    const dureeTotale = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const decisionGlobale = data.decision ? String(data.decision) : aDesEcarts ? 'AVEC_ECART' : 'CONFORME';
    const statutFinal = decisionGlobale === 'REFUSE'
      ? 'NON_CONFORME'
      : aDesEcarts
      ? 'ECART_MAGASIN'
      : 'VALIDE_MAGASIN';

    await pool.request()
      .input('bon_id', sql.Int, bon_id)
      .input('decision', sql.NVarChar, decisionGlobale)
      .input('remarques', sql.NVarChar, remarques_magasin)
      .input('user_id', sql.Int, user_id)
      .input('duree', sql.Int, dureeTotale)
      .input('statut', sql.NVarChar, statutFinal)
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

    // Audit History
    const auditDetails = `Validation Magasin effectuée : ${decisionGlobale} (Clôture en ${dureeTotale} j). Remarques : ${remarques_magasin || 'Aucune'}`;
    await pool.request()
      .input('bon_id', sql.Int, bon_id)
      .input('details', sql.NVarChar, auditDetails)
      .input('user_id', sql.Int, user_id)
      .input('user_nom', sql.NVarChar, user_nom)
      .query(`
        INSERT INTO HistoriqueTracabilite (bon_reception_id, action, details, effectue_par_id, effectue_par_nom, role_utilisateur)
        VALUES (@bon_id, 'CLOTURE_MAGASIN', @details, @user_id, @user_nom, 'magasin')
      `);

    // Real Notification for Appro
    await pool.request()
      .input('msg', sql.NVarChar, `Le bon N° ${bon.numero_reception} a été vérifié et clôturé par le Magasin (${decisionGlobale}). Cycle complet achevé.`)
      .input('bon_id', sql.Int, bon_id)
      .query(`
        INSERT INTO Notifications (titre, message, role_destinataire, bon_reception_id, lu, date_creation)
        VALUES ('Bon Réception Clôturé', @msg, 'appro', @bon_id, 0, GETDATE())
      `);

    return res.json({
      success: true,
      decision: decisionGlobale,
      statut: statutFinal,
      message: `Vérification Magasin enregistrée. Le bon N° ${bon.numero_reception} est désormais clôturé (${decisionGlobale}).`
    });
  } catch (err: any) {
    console.error('Error in submitMagasin:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
