import { Request, Response } from 'express';
import { getPool, sql } from '../config/db';

export async function getCommandes(req: Request, res: Response) {
  try {
    const search = String(req.query.search || '').trim();
    const statut = String(req.query.statut || '').trim();
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT c.id, c.numero_commande, c.date_commande, c.ref_sap, 
             c.fournisseur_id, c.fournisseur_nom, c.statut, c.date_created, c.date_updated,
             (SELECT COUNT(*) FROM LignesCommande l WHERE l.commande_id = c.id) AS total_lignes,
             (SELECT SUM(l.quantite_commandee) FROM LignesCommande l WHERE l.commande_id = c.id) AS quantite_totale
      FROM Commandes c
      WHERE 1=1
    `;

    if (statut && statut !== 'TOUS') {
      request.input('statut', sql.NVarChar, statut);
      query += ` AND c.statut = @statut`;
    }

    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
      query += ` AND (
        c.numero_commande LIKE @search OR
        c.ref_sap LIKE @search OR
        c.fournisseur_nom LIKE @search OR
        EXISTS (
          SELECT 1 FROM LignesCommande l 
          WHERE l.commande_id = c.id 
          AND (l.code_article LIKE @search OR l.designation_article LIKE @search)
        )
      )`;
    }

    query += ` ORDER BY c.id DESC`;

    const result = await request.query(query);
    return res.json(result.recordset);
  } catch (err: any) {
    console.error('Error in getCommandes:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getCommandeById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const pool = await getPool();

    const cmdResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT c.id, c.numero_commande, c.date_commande, c.ref_sap, 
               c.fournisseur_id, c.fournisseur_nom, c.statut, c.date_created, c.date_updated,
               (SELECT COUNT(*) FROM LignesCommande l WHERE l.commande_id = c.id) AS total_lignes,
               (SELECT SUM(l.quantite_commandee) FROM LignesCommande l WHERE l.commande_id = c.id) AS quantite_totale
        FROM Commandes c
        WHERE c.id = @id
      `);

    if (cmdResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const commande = cmdResult.recordset[0];

    // Fetch lines
    const lignesResult = await pool.request()
      .input('commande_id', sql.Int, id)
      .query(`
        SELECT id, commande_id, ligne_numero, article_id, code_article, designation_article, 
               quantite_commandee, unite_mesure, quantite_deja_recue
        FROM LignesCommande
        WHERE commande_id = @commande_id
        ORDER BY ligne_numero ASC
      `);

    commande.lignes = lignesResult.recordset;

    return res.json(commande);
  } catch (err: any) {
    console.error('Error in getCommandeById:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function createCommande(req: Request, res: Response) {
  try {
    const { numero_commande, date_commande, ref_sap, fournisseur_id, fournisseur_nom, lignes } = req.body;

    if (!numero_commande || !date_commande || !fournisseur_nom) {
      return res.status(400).json({ error: 'N° de commande, date et fournisseur sont obligatoires' });
    }

    if (!Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ error: 'La commande doit comporter au moins une ligne article.' });
    }

    const cleanNum = String(numero_commande).trim();
    const cleanDate = String(date_commande).trim();
    const cleanRefSap = ref_sap ? String(ref_sap).trim() : null;
    const cleanFournisseurNom = String(fournisseur_nom).trim();
    const fourId = fournisseur_id ? parseInt(String(fournisseur_id), 10) : null;

    const pool = await getPool();

    // Check duplicate order number
    const check = await pool.request()
      .input('num', sql.NVarChar, cleanNum)
      .query(`SELECT id FROM Commandes WHERE numero_commande = @num`);

    if (check.recordset.length > 0) {
      return res.status(400).json({ error: `La commande "${cleanNum}" existe déjà.` });
    }

    // Insert Commande header
    const insertHeader = await pool.request()
      .input('num', sql.NVarChar, cleanNum)
      .input('date_cmd', sql.Date, cleanDate)
      .input('ref_sap', sql.NVarChar, cleanRefSap)
      .input('four_id', sql.Int, fourId)
      .input('four_nom', sql.NVarChar, cleanFournisseurNom)
      .query(`
        INSERT INTO Commandes (numero_commande, date_commande, ref_sap, fournisseur_id, fournisseur_nom, statut, date_created, date_updated)
        OUTPUT INSERTED.id
        VALUES (@num, @date_cmd, @ref_sap, @four_id, @four_nom, 'EN_COURS', GETDATE(), GETDATE())
      `);

    const commandeId = insertHeader.recordset[0].id;

    // Insert Lines
    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i];
      const artId = ligne.article_id ? parseInt(String(ligne.article_id), 10) : null;
      const codeArt = String(ligne.code_article || `ART-${i + 1}`).trim();
      const desigArt = String(ligne.designation_article || 'Article').trim();
      const qte = parseFloat(String(ligne.quantite_commandee)) || 1.0;
      const unite = String(ligne.unite_mesure || 'pce').trim();

      await pool.request()
        .input('cmd_id', sql.Int, commandeId)
        .input('ligne_num', sql.Int, i + 1)
        .input('art_id', sql.Int, artId)
        .input('code_art', sql.NVarChar, codeArt)
        .input('desig_art', sql.NVarChar, desigArt)
        .input('qte', sql.Decimal(18, 3), qte)
        .input('unite', sql.NVarChar, unite)
        .query(`
          INSERT INTO LignesCommande (commande_id, ligne_numero, article_id, code_article, designation_article, quantite_commandee, unite_mesure, quantite_deja_recue)
          VALUES (@cmd_id, @ligne_num, @art_id, @code_art, @desig_art, @qte, @unite, 0)
        `);
    }

    return res.status(201).json({
      id: commandeId,
      numero_commande: cleanNum,
      message: 'Commande créée avec succès'
    });
  } catch (err: any) {
    console.error('Error in createCommande:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function updateCommande(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const { numero_commande, date_commande, ref_sap, fournisseur_id, fournisseur_nom, statut, lignes } = req.body;

    if (!numero_commande || !date_commande || !fournisseur_nom) {
      return res.status(400).json({ error: 'N° de commande, date et fournisseur sont obligatoires' });
    }

    const cleanNum = String(numero_commande).trim();
    const cleanDate = String(date_commande).trim();
    const cleanRefSap = ref_sap ? String(ref_sap).trim() : null;
    const cleanFournisseurNom = String(fournisseur_nom).trim();
    const fourId = fournisseur_id ? parseInt(String(fournisseur_id), 10) : null;
    const cleanStatut = statut ? String(statut).trim() : 'EN_COURS';

    const pool = await getPool();

    // Check duplicate
    const check = await pool.request()
      .input('num', sql.NVarChar, cleanNum)
      .input('id', sql.Int, id)
      .query(`SELECT id FROM Commandes WHERE numero_commande = @num AND id != @id`);

    if (check.recordset.length > 0) {
      return res.status(400).json({ error: `Le numéro de commande "${cleanNum}" est déjà utilisé.` });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('num', sql.NVarChar, cleanNum)
      .input('date_cmd', sql.Date, cleanDate)
      .input('ref_sap', sql.NVarChar, cleanRefSap)
      .input('four_id', sql.Int, fourId)
      .input('four_nom', sql.NVarChar, cleanFournisseurNom)
      .input('statut', sql.NVarChar, cleanStatut)
      .query(`
        UPDATE Commandes
        SET numero_commande = @num, date_commande = @date_cmd, ref_sap = @ref_sap,
            fournisseur_id = @four_id, fournisseur_nom = @four_nom, statut = @statut,
            date_updated = GETDATE()
        WHERE id = @id
      `);

    // If new lignes provided, replace them
    if (Array.isArray(lignes) && lignes.length > 0) {
      await pool.request()
        .input('cmd_id', sql.Int, id)
        .query(`DELETE FROM LignesCommande WHERE commande_id = @cmd_id`);

      for (let i = 0; i < lignes.length; i++) {
        const ligne = lignes[i];
        const artId = ligne.article_id ? parseInt(String(ligne.article_id), 10) : null;
        const codeArt = String(ligne.code_article || `ART-${i + 1}`).trim();
        const desigArt = String(ligne.designation_article || 'Article').trim();
        const qte = parseFloat(String(ligne.quantite_commandee)) || 1.0;
        const unite = String(ligne.unite_mesure || 'pce').trim();
        const recu = parseFloat(String(ligne.quantite_deja_recue || 0)) || 0;

        await pool.request()
          .input('cmd_id', sql.Int, id)
          .input('ligne_num', sql.Int, i + 1)
          .input('art_id', sql.Int, artId)
          .input('code_art', sql.NVarChar, codeArt)
          .input('desig_art', sql.NVarChar, desigArt)
          .input('qte', sql.Decimal(18, 3), qte)
          .input('unite', sql.NVarChar, unite)
          .input('recu', sql.Decimal(18, 3), recu)
          .query(`
            INSERT INTO LignesCommande (commande_id, ligne_numero, article_id, code_article, designation_article, quantite_commandee, unite_mesure, quantite_deja_recue)
            VALUES (@cmd_id, @ligne_num, @art_id, @code_art, @desig_art, @qte, @unite, @recu)
          `);
      }
    }

    return res.json({ message: 'Commande mise à jour avec succès' });
  } catch (err: any) {
    console.error('Error in updateCommande:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteCommande(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM Commandes WHERE id = @id`);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    return res.json({ message: 'Commande supprimée avec succès' });
  } catch (err: any) {
    console.error('Error in deleteCommande:', err);
    return res.status(500).json({ error: err.message });
  }
}

