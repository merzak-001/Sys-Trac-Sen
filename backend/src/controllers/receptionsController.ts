import { Request, Response } from 'express';
import { getPool, sql } from '../config/db';

export async function getFournisseurs(req: Request, res: Response) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT DISTINCT name FROM (
        SELECT name FROM Fournisseurs WHERE name IS NOT NULL AND name != ''
        UNION
        SELECT fournisseur AS name FROM BonsReception WHERE fournisseur IS NOT NULL AND fournisseur != ''
      ) AS f
      ORDER BY name ASC
    `);
    const suppliers = result.recordset.map((r: any) => r.name);
    return res.json(suppliers);
  } catch (err: any) {
    console.error('Error in getFournisseurs:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getReceptions(req: Request, res: Response) {
  try {
    const search = String(req.query.search || '').trim();
    const statut = String(req.query.statut || '').trim();
    const fournisseur = String(req.query.fournisseur || '').trim();
    const filter_tab = String(req.query.filter_tab || 'all').trim();
    const user_role = String(req.query.user_role || 'all').trim();
    const role_view = String(req.query.role_view || '').trim();

    const pool = await getPool();
    let query = `
      SELECT b.id, b.numero_reception, b.fournisseur, b.date_reception, b.date_creation,
             b.statut, b.remarques_appro, 
             b.decision_technique, b.remarques_technique, b.date_validation_technique, b.duree_jours_technique,
             b.decision_magasin, b.remarques_magasin, b.date_validation_magasin, b.duree_jours_totale,
             COALESCE(
               CASE WHEN u_app.role = 'appro' OR u_app.role = 'admin' THEN u_app.full_name ELSE NULL END,
               u_app.full_name,
               'Agent Approvisionnement'
             ) AS cree_par_nom,
             COALESCE(
               CASE WHEN u_tech.role = 'technique' OR u_tech.role = 'admin' THEN u_tech.full_name ELSE NULL END,
               'Responsable Contrôle Technique'
             ) AS valideur_technique_nom,
             COALESCE(
               CASE WHEN u_mag.role = 'magasin' OR u_mag.role = 'admin' THEN u_mag.full_name ELSE NULL END,
               'Gestionnaire Magasin'
             ) AS valideur_magasin_nom,
             (SELECT COUNT(*) FROM BonReceptionLignes l WHERE l.bon_reception_id = b.id) AS total_lignes,
             (SELECT SUM(l.quantite_attendue) FROM BonReceptionLignes l WHERE l.bon_reception_id = b.id) AS quantite_totale,
             (SELECT SUM(ISNULL(l.quantite_recue_magasin, 0)) FROM BonReceptionLignes l WHERE l.bon_reception_id = b.id) AS quantite_magasin_totale,
             (SELECT SUM(ISNULL(l.defauts_trouves, 0)) FROM BonReceptionLignes l WHERE l.bon_reception_id = b.id) AS total_defauts
      FROM BonsReception b
      LEFT JOIN Users u_app ON b.cree_par_id = u_app.id
      LEFT JOIN Users u_tech ON b.valideur_technique_id = u_tech.id
      LEFT JOIN Users u_mag ON b.valideur_magasin_id = u_mag.id
      WHERE 1=1
    `;

    const request = pool.request();

    if (role_view === 'technique') {
      query += ` AND b.statut IN ('EN_ATTENTE_TECHNIQUE', 'EN_COURS_TECHNIQUE')`;
    } else if (role_view === 'magasin') {
      query += ` AND b.statut = 'VALIDE_TECHNIQUE'`;
    }

    if (statut && statut !== 'TOUS') {
      request.input('statut', sql.NVarChar, statut);
      query += ` AND b.statut = @statut`;
    }

    if (fournisseur && fournisseur !== 'TOUS') {
      request.input('fournisseur', sql.NVarChar, fournisseur);
      query += ` AND b.fournisseur = @fournisseur`;
    }

    if (filter_tab === 'pending_me') {
      if (user_role === 'technique') {
        query += ` AND b.statut IN ('EN_ATTENTE_TECHNIQUE', 'EN_COURS_TECHNIQUE')`;
      } else if (user_role === 'magasin') {
        query += ` AND b.statut = 'VALIDE_TECHNIQUE'`;
      } else if (user_role === 'appro') {
        query += ` AND b.statut != 'VALIDE_MAGASIN'`;
      }
    } else if (filter_tab === 'completed') {
      query += ` AND b.statut = 'VALIDE_MAGASIN'`;
    } else if (filter_tab === 'issues') {
      query += ` AND (b.statut IN ('NON_CONFORME', 'ECART_MAGASIN') OR b.decision_technique = 'NON_CONFORME' OR b.decision_magasin = 'AVEC_ECART')`;
    }

    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
      query += ` AND (
        b.numero_reception LIKE @search OR
        b.fournisseur LIKE @search OR
        b.remarques_appro LIKE @search OR
        EXISTS (
          SELECT 1 FROM BonReceptionLignes l 
          WHERE l.bon_reception_id = b.id 
          AND (l.code_article LIKE @search OR l.designation_article LIKE @search OR l.numero_commande LIKE @search OR l.numero_commande_sap LIKE @search)
        )
      )`;
    }

    query += ` ORDER BY b.id DESC`;

    const result = await request.query(query);
    const list = result.recordset;

    // Attach sample items (top 3)
    for (const b of list) {
      const itemsRes = await pool.request()
        .input('bon_id', sql.Int, b.id)
        .query(`
          SELECT TOP 3 code_article, designation_article, quantite_attendue, unite_mesure
          FROM BonReceptionLignes
          WHERE bon_reception_id = @bon_id
          ORDER BY ligne_numero ASC
        `);
      b.sample_items = itemsRes.recordset;
    }

    return res.json(list);
  } catch (err: any) {
    console.error('Error in getReceptions:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getReceptionById(req: Request, res: Response) {
  try {
    const bon_id = parseInt(req.params.id, 10);
    const pool = await getPool();

    const result = await pool.request()
      .input('bon_id', sql.Int, bon_id)
      .query(`
        SELECT b.*, 
               COALESCE(
                 CASE WHEN u_app.role = 'appro' OR u_app.role = 'admin' THEN u_app.full_name ELSE NULL END,
                 u_app.full_name,
                 'Agent Approvisionnement'
               ) AS cree_par_nom,
               COALESCE(
                 CASE WHEN u_tech.role = 'technique' OR u_tech.role = 'admin' THEN u_tech.full_name ELSE NULL END,
                 'Responsable Contrôle Technique'
               ) AS valideur_technique_nom,
               COALESCE(
                 CASE WHEN u_mag.role = 'magasin' OR u_mag.role = 'admin' THEN u_mag.full_name ELSE NULL END,
                 'Gestionnaire Magasin'
               ) AS valideur_magasin_nom
        FROM BonsReception b
        LEFT JOIN Users u_app ON b.cree_par_id = u_app.id
        LEFT JOIN Users u_tech ON b.valideur_technique_id = u_tech.id
        LEFT JOIN Users u_mag ON b.valideur_magasin_id = u_mag.id
        WHERE b.id = @bon_id
      `);

    const bon = result.recordset[0];
    if (!bon) {
      return res.status(404).json({ error: 'Bon de réception non trouvé' });
    }

    const lignesRes = await pool.request()
      .input('bon_id', sql.Int, bon_id)
      .query(`
        SELECT l.*,
               u_tech.full_name AS controleur_technique_nom,
               u_mag.full_name AS controleur_magasin_nom
        FROM BonReceptionLignes l
        LEFT JOIN Users u_tech ON l.controleur_technique_id = u_tech.id
        LEFT JOIN Users u_mag ON l.controleur_magasin_id = u_mag.id
        WHERE l.bon_reception_id = @bon_id
        ORDER BY l.ligne_numero ASC
      `);

    const histRes = await pool.request()
      .input('bon_id', sql.Int, bon_id)
      .query(`
        SELECT h.*, u.full_name AS user_nom
        FROM HistoriqueTracabilite h
        LEFT JOIN Users u ON h.effectue_par_id = u.id
        WHERE h.bon_reception_id = @bon_id
        ORDER BY h.timestamp ASC, h.id ASC
      `);

    bon.lignes = lignesRes.recordset;
    bon.historique = histRes.recordset;

    return res.json(bon);
  } catch (err: any) {
    console.error('Error in getReceptionById:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function createReception(req: Request, res: Response) {
  try {
    const data = req.body || {};
    let numero_reception = String(data.numero_reception || '').trim();
    let fournisseur = String(data.fournisseur || '').trim();
    let date_reception = String(data.date_reception || '').trim();
    const remarques_appro = String(data.remarques_appro || '').trim();
    let items = Array.isArray(data.items) ? data.items : [];
    const user_id = data.user_id || 1;
    const user_nom = data.user_nom || 'Agent Approvisionnement';

    if (!fournisseur) fournisseur = 'SLR';
    if (!date_reception) date_reception = new Date().toISOString().split('T')[0];

    const pool = await getPool();

    // Verify creator identity: ensure user is appro or admin
    let effectiveUserId = 1;
    let effectiveUserNom = 'Agent Approvisionnement';

    if (user_id) {
      const uRes = await pool.request()
        .input('uid', sql.Int, parseInt(String(user_id), 10))
        .query(`SELECT id, full_name, role FROM Users WHERE id = @uid`);
      const u = uRes.recordset[0];
      if (u && (u.role === 'appro' || u.role === 'admin')) {
        effectiveUserId = u.id;
        effectiveUserNom = user_nom || u.full_name;
      } else {
        const defaultAppro = await pool.request()
          .query(`SELECT TOP 1 id, full_name FROM Users WHERE role = 'appro' AND is_active = 1 ORDER BY id ASC`);
        if (defaultAppro.recordset[0]) {
          effectiveUserId = defaultAppro.recordset[0].id;
          effectiveUserNom = defaultAppro.recordset[0].full_name;
        }
      }
    } else {
      const defaultAppro = await pool.request()
        .query(`SELECT TOP 1 id, full_name FROM Users WHERE role = 'appro' AND is_active = 1 ORDER BY id ASC`);
      if (defaultAppro.recordset[0]) {
        effectiveUserId = defaultAppro.recordset[0].id;
        effectiveUserNom = defaultAppro.recordset[0].full_name;
      }
    }

    if (!numero_reception) {
      const nextRes = await pool.request().query(`SELECT ISNULL(MAX(id), 0) + 1 AS next_id FROM BonsReception`);
      const nextId = nextRes.recordset[0].next_id;
      numero_reception = `REC-2026-${String(nextId).padStart(4, '0')}`;
    }

    // Unique check
    const existRes = await pool.request()
      .input('num', sql.NVarChar, numero_reception)
      .query(`SELECT id FROM BonsReception WHERE numero_reception = @num`);

    if (existRes.recordset.length > 0) {
      const suffix = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
      numero_reception = `${numero_reception}-${suffix}`;
    }

    if (items.length === 0) {
      items = [{
        code_article: 'ART-01',
        designation_article: 'Marchandise standard',
        quantite_attendue: 100,
        unite_mesure: 'pce',
        numero_commande: '',
        numero_commande_sap: ''
      }];
    }

    // Insert Header
    const insertHeader = await pool.request()
      .input('num', sql.NVarChar, numero_reception)
      .input('fournisseur', sql.NVarChar, fournisseur)
      .input('date_rec', sql.Date, date_reception)
      .input('user_id', sql.Int, effectiveUserId)
      .input('remarques', sql.NVarChar, remarques_appro)
      .query(`
        INSERT INTO BonsReception (
          numero_reception, fournisseur, date_reception, date_creation,
          statut, cree_par_id, remarques_appro
        )
        OUTPUT INSERTED.id
        VALUES (@num, @fournisseur, @date_rec, GETDATE(), 'EN_ATTENTE_TECHNIQUE', @user_id, @remarques)
      `);

    const bon_id = insertHeader.recordset[0].id;

    // Insert Items
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const code = String(it.code_article || '').trim() || `ART-${idx + 1}`;
      const desig = String(it.designation_article || '').trim() || `Article ${idx + 1}`;
      const qty = parseFloat(it.quantite_attendue) || 1.0;
      const uom = String(it.unite_mesure || 'pce').trim() || 'pce';
      const cmd = String(it.numero_commande || '').trim();
      const sap = String(it.numero_commande_sap || '').trim();

      await pool.request()
        .input('bon_id', sql.Int, bon_id)
        .input('ligne_num', sql.Int, idx + 1)
        .input('code', sql.NVarChar, code)
        .input('desig', sql.NVarChar, desig)
        .input('cmd', sql.NVarChar, cmd)
        .input('sap', sql.NVarChar, sap)
        .input('qty', sql.Decimal(18, 3), qty)
        .input('uom', sql.NVarChar, uom)
        .query(`
          INSERT INTO BonReceptionLignes (
            bon_reception_id, ligne_numero, code_article, designation_article,
            numero_commande, numero_commande_sap, quantite_attendue, unite_mesure,
            statut_technique, statut_magasin
          ) VALUES (
            @bon_id, @ligne_num, @code, @desig, @cmd, @sap, @qty, @uom, 'EN_ATTENTE', 'EN_ATTENTE'
          )
        `);
    }

    // Insert Audit History
    await pool.request()
      .input('bon_id', sql.Int, bon_id)
      .input('details', sql.NVarChar, `Bon ${numero_reception} créé avec ${items.length} article(s). En attente de Contrôle Technique.`)
      .input('user_id', sql.Int, effectiveUserId)
      .input('user_nom', sql.NVarChar, effectiveUserNom)
      .query(`
        INSERT INTO HistoriqueTracabilite (bon_reception_id, action, details, effectue_par_id, effectue_par_nom, role_utilisateur)
        VALUES (@bon_id, 'CREATION_RECEPTION', @details, @user_id, @user_nom, 'appro')
      `);

    // Insert Notification for Contrôle Technique
    await pool.request()
      .input('msg', sql.NVarChar, `Nouveau bon N° ${numero_reception} (${fournisseur}, ${items.length} articles) en attente de contrôle technique.`)
      .input('bon_id', sql.Int, bon_id)
      .query(`
        INSERT INTO Notifications (titre, message, role_destinataire, bon_reception_id, lu, date_creation)
        VALUES ('Nouveau Bon Réception', @msg, 'technique', @bon_id, 0, GETDATE())
      `);

    return res.json({
      success: true,
      bon_id,
      numero_reception,
      message: `Bon de réception N° ${numero_reception} créé avec succès et envoyé au Contrôle Technique.`
    });
  } catch (err: any) {
    console.error('Error in createReception:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateRemarques(req: Request, res: Response) {
  try {
    const bon_id = parseInt(req.params.id, 10);
    const { remarques_appro, remarques_technique, remarques_magasin, user_id, user_nom } = req.body || {};
    const pool = await getPool();

    await pool.request()
      .input('bon_id', sql.Int, bon_id)
      .input('rem_app', sql.NVarChar, remarques_appro || null)
      .input('rem_tech', sql.NVarChar, remarques_technique || null)
      .input('rem_mag', sql.NVarChar, remarques_magasin || null)
      .query(`
        UPDATE BonsReception
        SET remarques_appro = COALESCE(@rem_app, remarques_appro),
            remarques_technique = COALESCE(@rem_tech, remarques_technique),
            remarques_magasin = COALESCE(@rem_mag, remarques_magasin)
        WHERE id = @bon_id
      `);

    await pool.request()
      .input('bon_id', sql.Int, bon_id)
      .input('user_id', sql.Int, user_id || 1)
      .input('user_nom', sql.NVarChar, user_nom || 'Utilisateur')
      .query(`
        INSERT INTO HistoriqueTracabilite (bon_reception_id, action, details, effectue_par_id, effectue_par_nom)
        VALUES (@bon_id, 'MISE_A_JOUR_OBSERVATIONS', 'Observations / remarques mises à jour', @user_id, @user_nom)
      `);

    return res.json({ success: true, message: 'Remarques enregistrées.' });
  } catch (err: any) {
    console.error('Error in updateRemarques:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateReception(req: Request, res: Response) {
  try {
    const bon_id = parseInt(req.params.id, 10);
    const data = req.body || {};
    const user_role = String(data.user_role || data.role || 'appro').toLowerCase();
    const user_id = data.user_id || 1;
    const user_nom = data.user_nom || 'Utilisateur';

    const {
      numero_reception,
      fournisseur,
      date_reception,
      statut,
      remarques_appro,
      remarques_technique,
      remarques_magasin,
      decision_technique,
      decision_magasin,
      items,
      lignes
    } = data;

    const pool = await getPool();

    // Check if bon exists
    const checkRes = await pool.request()
      .input('bon_id', sql.Int, bon_id)
      .query(`SELECT * FROM BonsReception WHERE id = @bon_id`);

    if (checkRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Bon de réception non trouvé' });
    }

    const currentBon = checkRes.recordset[0];
    const linesToSave = Array.isArray(items) ? items : (Array.isArray(lignes) ? lignes : null);

    // Fetch existing lines to preserve other roles' data
    const existingLinesRes = await pool.request()
      .input('bon_id', sql.Int, bon_id)
      .query(`SELECT * FROM BonReceptionLignes WHERE bon_reception_id = @bon_id ORDER BY ligne_numero ASC`);
    const existingLines = existingLinesRes.recordset;

    let actionDetails = '';

    // ==========================================
    // ROLE: CONTRÔLE TECHNIQUE
    // ==========================================
    if (user_role === 'technique') {
      let effectiveTechId = 2;
      let effectiveTechNom = user_nom || 'Responsable Contrôle Technique';
      if (user_id) {
        const uRes = await pool.request().input('uid', sql.Int, parseInt(String(user_id), 10)).query(`SELECT id, full_name, role FROM Users WHERE id = @uid`);
        if (uRes.recordset[0] && (uRes.recordset[0].role === 'technique' || uRes.recordset[0].role === 'admin')) {
          effectiveTechId = uRes.recordset[0].id;
          effectiveTechNom = user_nom || uRes.recordset[0].full_name;
        } else {
          const defTech = await pool.request().query(`SELECT TOP 1 id, full_name FROM Users WHERE role = 'technique' AND is_active = 1 ORDER BY id ASC`);
          if (defTech.recordset[0]) {
            effectiveTechId = defTech.recordset[0].id;
            effectiveTechNom = defTech.recordset[0].full_name;
          }
        }
      }

      const decTech = decision_technique !== undefined ? String(decision_technique).trim() : currentBon.decision_technique;
      const remTech = remarques_technique !== undefined ? String(remarques_technique).trim() : currentBon.remarques_technique;

      // Auto-advance general status based on technical decision
      let newStatut = currentBon.statut;
      if (decTech === 'NON_CONFORME') {
        newStatut = 'NON_CONFORME';
      } else if (decTech === 'CONFORME' || decTech === 'AVEC_RESERVE') {
        newStatut = 'VALIDE_TECHNIQUE';
      }

      await pool.request()
        .input('bon_id', sql.Int, bon_id)
        .input('dec_tech', sql.NVarChar, decTech || null)
        .input('rem_tech', sql.NVarChar, remTech || null)
        .input('statut', sql.NVarChar, newStatut)
        .input('user_id', sql.Int, effectiveTechId)
        .query(`
          UPDATE BonsReception
          SET decision_technique = @dec_tech,
              remarques_technique = @rem_tech,
              statut = @statut,
              valideur_technique_id = @user_id,
              date_validation_technique = GETDATE(),
              duree_jours_technique = DATEDIFF(day, date_creation, GETDATE())
          WHERE id = @bon_id
        `);

      // Update lines technical evaluation
      if (linesToSave) {
        for (const it of linesToSave) {
          const lNum = it.ligne_numero || 1;
          const stTech = it.statut_technique || 'CONFORME';
          const defauts = it.defauts_trouves !== undefined ? parseInt(String(it.defauts_trouves), 10) || 0 : 0;
          const remTechLine = (it.remarques_technique !== undefined ? it.remarques_technique : it.commentaire_technique) ? String(it.remarques_technique || it.commentaire_technique).trim() : null;

          await pool.request()
            .input('bon_id', sql.Int, bon_id)
            .input('l_num', sql.Int, lNum)
            .input('st_tech', sql.NVarChar, stTech)
            .input('defauts', sql.Int, defauts)
            .input('rem_tech', sql.NVarChar, remTechLine)
            .input('user_id', sql.Int, effectiveTechId)
            .query(`
              UPDATE BonReceptionLignes
              SET statut_technique = @st_tech,
                  defauts_trouves = @defauts,
                  remarques_technique = @rem_tech,
                  commentaire_technique = @rem_tech,
                  controleur_technique_id = @user_id,
                  date_controle_technique = GETDATE()
              WHERE bon_reception_id = @bon_id AND ligne_numero = @l_num
            `);
        }
      }

      actionDetails = `Mise à jour Contrôle Technique par ${effectiveTechNom} (Avis: ${decTech || 'Non défini'})`;

      // ==========================================
      // ROLE: MAGASINIER
      // ==========================================
    } else if (user_role === 'magasin') {
      let effectiveMagId = 3;
      let effectiveMagNom = user_nom || 'Gestionnaire Magasin';
      if (user_id) {
        const uRes = await pool.request().input('uid', sql.Int, parseInt(String(user_id), 10)).query(`SELECT id, full_name, role FROM Users WHERE id = @uid`);
        if (uRes.recordset[0] && (uRes.recordset[0].role === 'magasin' || uRes.recordset[0].role === 'admin')) {
          effectiveMagId = uRes.recordset[0].id;
          effectiveMagNom = user_nom || uRes.recordset[0].full_name;
        } else {
          const defMag = await pool.request().query(`SELECT TOP 1 id, full_name FROM Users WHERE role = 'magasin' AND is_active = 1 ORDER BY id ASC`);
          if (defMag.recordset[0]) {
            effectiveMagId = defMag.recordset[0].id;
            effectiveMagNom = defMag.recordset[0].full_name;
          }
        }
      }

      const decMag = decision_magasin !== undefined ? String(decision_magasin).trim() : currentBon.decision_magasin;
      const remMag = remarques_magasin !== undefined ? String(remarques_magasin).trim() : currentBon.remarques_magasin;

      let newStatut = currentBon.statut;
      if (decMag === 'AVEC_ECART') {
        newStatut = 'ECART_MAGASIN';
      } else if (decMag === 'REFUSE') {
        newStatut = 'NON_CONFORME';
      } else if (decMag === 'CONFORME') {
        newStatut = 'VALIDE_MAGASIN';
      }

      await pool.request()
        .input('bon_id', sql.Int, bon_id)
        .input('dec_mag', sql.NVarChar, decMag || null)
        .input('rem_mag', sql.NVarChar, remMag || null)
        .input('statut', sql.NVarChar, newStatut)
        .input('user_id', sql.Int, effectiveMagId)
        .query(`
          UPDATE BonsReception
          SET decision_magasin = @dec_mag,
              remarques_magasin = @rem_mag,
              statut = @statut,
              valideur_magasin_id = @user_id,
              date_validation_magasin = GETDATE(),
              duree_jours_totale = DATEDIFF(day, date_creation, GETDATE())
          WHERE id = @bon_id
        `);

      // Update lines store receipts (quantités physiques reçues et statut magasin)
      if (linesToSave) {
        for (const it of linesToSave) {
          const lNum = it.ligne_numero || 1;
          const qtyRecue = it.quantite_recue_magasin !== undefined && it.quantite_recue_magasin !== null && it.quantite_recue_magasin !== ''
            ? parseFloat(it.quantite_recue_magasin)
            : null;
          const stMag = it.statut_magasin || 'CONFORME';
          const rMag = it.remarques_magasin !== undefined ? String(it.remarques_magasin).trim() : null;

          await pool.request()
            .input('bon_id', sql.Int, bon_id)
            .input('l_num', sql.Int, lNum)
            .input('qty_mag', sql.Decimal(18, 3), qtyRecue)
            .input('st_mag', sql.NVarChar, stMag)
            .input('rem_mag', sql.NVarChar, rMag)
            .input('user_id', sql.Int, effectiveMagId)
            .query(`
              UPDATE BonReceptionLignes
              SET quantite_recue_magasin = @qty_mag,
                  statut_magasin = @st_mag,
                  remarques_magasin = @rem_mag,
                  controleur_magasin_id = @user_id,
                  date_controle_magasin = GETDATE()
              WHERE bon_reception_id = @bon_id AND ligne_numero = @l_num
            `);
        }
      }

      // Ensure Palettes are generated if reception is validated by Magasin
      if (newStatut === 'VALIDE_MAGASIN' || newStatut === 'ECART_MAGASIN') {
        await pool.request()
          .input('bon_id', sql.Int, bon_id)
          .input('user_nom', sql.NVarChar, effectiveMagNom)
          .query(`
            INSERT INTO Palettes (
              code_palette, reception_id, reception_ligne_id, numero_reception,
              article_code, designation, fournisseur, quantite, statut,
              emplacement, date_entree_magasin, operateur_magasin, remarques, code_qr_data
            )
            SELECT 
              CONCAT('PAL-', FORMAT(b.date_reception, 'yyyy'), '-', RIGHT(CONCAT('0000', l.id), 4)),
              b.id, l.id, b.numero_reception,
              COALESCE(l.code_article, 'N/A'),
              COALESCE(l.designation_article, 'N/A'),
              b.fournisseur,
              COALESCE(l.quantite_recue_magasin, l.quantite_attendue),
              'DISPONIBLE',
              COALESCE(l.emplacement, 'Zone Magasin'),
              COALESCE(b.date_validation_magasin, GETDATE()),
              @user_nom,
              l.remarques_magasin,
              CONCAT('BR:', b.numero_reception, '|ART:', COALESCE(l.code_article, 'N/A'), '|QTE:', COALESCE(l.quantite_recue_magasin, l.quantite_attendue))
            FROM BonReceptionLignes l
            INNER JOIN BonsReception b ON l.bon_reception_id = b.id
            WHERE b.id = @bon_id
              AND NOT EXISTS (SELECT 1 FROM Palettes p WHERE p.reception_ligne_id = l.id);
          `);
      }

      actionDetails = `Pointage et réception Magasin mis à jour par ${effectiveMagNom} (Décision: ${decMag || 'Non définie'})`;

      // ==========================================
      // ROLE: APPROVISIONNEMENT
      // ==========================================
    } else if (user_role === 'appro') {
      const cleanNum = numero_reception ? String(numero_reception).trim() : currentBon.numero_reception;

      // Duplicate check if num changed
      if (cleanNum !== currentBon.numero_reception) {
        const dupCheck = await pool.request()
          .input('num', sql.NVarChar, cleanNum)
          .input('bon_id', sql.Int, bon_id)
          .query(`SELECT id FROM BonsReception WHERE numero_reception = @num AND id != @bon_id`);

        if (dupCheck.recordset.length > 0) {
          return res.status(400).json({ error: `Le numéro de réception "${cleanNum}" est déjà utilisé.` });
        }
      }

      const cleanFournisseur = fournisseur ? String(fournisseur).trim() : currentBon.fournisseur;
      const cleanDate = date_reception ? String(date_reception).trim() : currentBon.date_reception;
      const cleanRemAppro = remarques_appro !== undefined ? String(remarques_appro).trim() : currentBon.remarques_appro;

      await pool.request()
        .input('bon_id', sql.Int, bon_id)
        .input('num', sql.NVarChar, cleanNum)
        .input('fournisseur', sql.NVarChar, cleanFournisseur)
        .input('date_rec', sql.Date, cleanDate)
        .input('rem_appro', sql.NVarChar, cleanRemAppro)
        .query(`
          UPDATE BonsReception
          SET numero_reception = @num,
              fournisseur = @fournisseur,
              date_reception = @date_rec,
              remarques_appro = @rem_appro
          WHERE id = @bon_id
        `);

      // Update lines expected info, keeping any existing technical/store status
      if (linesToSave) {
        await pool.request().input('bon_id', sql.Int, bon_id).query(`DELETE FROM BonReceptionLignes WHERE bon_reception_id = @bon_id`);

        for (let idx = 0; idx < linesToSave.length; idx++) {
          const it = linesToSave[idx];
          const matchedOld = existingLines.find((oldL: any) => oldL.ligne_numero === (it.ligne_numero || idx + 1)) || {};

          const code = String(it.code_article || '').trim() || `ART-${idx + 1}`;
          const desig = String(it.designation_article || '').trim() || `Article ${idx + 1}`;
          const cmd = String(it.numero_commande || '').trim();
          const sap = String(it.numero_commande_sap || '').trim();
          const qtyAtt = parseFloat(it.quantite_attendue) || 0;
          const uom = String(it.unite_mesure || 'pce').trim() || 'pce';

          // Preserve existing tech/magasin fields if not provided
          const qtyMag = it.quantite_recue_magasin !== undefined && it.quantite_recue_magasin !== null && it.quantite_recue_magasin !== ''
            ? parseFloat(it.quantite_recue_magasin)
            : matchedOld.quantite_recue_magasin;
          const stTech = it.statut_technique || matchedOld.statut_technique || 'EN_ATTENTE';
          const stMag = it.statut_magasin || matchedOld.statut_magasin || 'EN_ATTENTE';
          const defauts = it.defauts_trouves !== undefined ? parseInt(String(it.defauts_trouves), 10) || 0 : (matchedOld.defauts_trouves || 0);
          const comTech = (it.remarques_technique !== undefined ? it.remarques_technique : it.commentaire_technique) ? String(it.remarques_technique || it.commentaire_technique).trim() : matchedOld.remarques_technique;
          const remMag = it.remarques_magasin !== undefined ? String(it.remarques_magasin).trim() : matchedOld.remarques_magasin;

          await pool.request()
            .input('bon_id', sql.Int, bon_id)
            .input('ligne_num', sql.Int, idx + 1)
            .input('code', sql.NVarChar, code)
            .input('desig', sql.NVarChar, desig)
            .input('cmd', sql.NVarChar, cmd)
            .input('sap', sql.NVarChar, sap)
            .input('qty_att', sql.Decimal(18, 3), qtyAtt)
            .input('qty_mag', sql.Decimal(18, 3), qtyMag != null ? qtyMag : null)
            .input('uom', sql.NVarChar, uom)
            .input('st_tech', sql.NVarChar, stTech)
            .input('st_mag', sql.NVarChar, stMag)
            .input('defauts', sql.Int, defauts)
            .input('rem_tech', sql.NVarChar, comTech || null)
            .input('rem_mag', sql.NVarChar, remMag || null)
            .query(`
              INSERT INTO BonReceptionLignes (
                bon_reception_id, ligne_numero, code_article, designation_article,
                numero_commande, numero_commande_sap, quantite_attendue, quantite_recue_magasin,
                unite_mesure, statut_technique, statut_magasin, defauts_trouves,
                remarques_technique, commentaire_technique, remarques_magasin
              ) VALUES (
                @bon_id, @ligne_num, @code, @desig,
                @cmd, @sap, @qty_att, @qty_mag,
                @uom, @st_tech, @st_mag, @defauts,
                @rem_tech, @rem_tech, @rem_mag
              )
            `);
        }
      }

      actionDetails = `Informations d'en-tête et articles mis à jour par l'Approvisionnement (${user_nom})`;

      // ==========================================
      // ROLE: ADMIN (Master override)
      // ==========================================
    } else {
      const cleanNum = numero_reception ? String(numero_reception).trim() : currentBon.numero_reception;

      if (cleanNum !== currentBon.numero_reception) {
        const dupCheck = await pool.request()
          .input('num', sql.NVarChar, cleanNum)
          .input('bon_id', sql.Int, bon_id)
          .query(`SELECT id FROM BonsReception WHERE numero_reception = @num AND id != @bon_id`);

        if (dupCheck.recordset.length > 0) {
          return res.status(400).json({ error: `Le numéro de réception "${cleanNum}" est déjà utilisé.` });
        }
      }

      await pool.request()
        .input('bon_id', sql.Int, bon_id)
        .input('num', sql.NVarChar, cleanNum)
        .input('fournisseur', sql.NVarChar, fournisseur ? String(fournisseur).trim() : null)
        .input('date_rec', sql.Date, date_reception ? String(date_reception).trim() : null)
        .input('statut', sql.NVarChar, statut ? String(statut).trim() : null)
        .input('rem_appro', sql.NVarChar, remarques_appro !== undefined ? String(remarques_appro).trim() : null)
        .input('rem_tech', sql.NVarChar, remarques_technique !== undefined ? String(remarques_technique).trim() : null)
        .input('rem_mag', sql.NVarChar, remarques_magasin !== undefined ? String(remarques_magasin).trim() : null)
        .input('dec_tech', sql.NVarChar, decision_technique !== undefined ? String(decision_technique).trim() : null)
        .input('dec_mag', sql.NVarChar, decision_magasin !== undefined ? String(decision_magasin).trim() : null)
        .query(`
          UPDATE BonsReception
          SET numero_reception = COALESCE(@num, numero_reception),
              fournisseur = COALESCE(@fournisseur, fournisseur),
              date_reception = COALESCE(@date_rec, date_reception),
              statut = COALESCE(@statut, statut),
              remarques_appro = COALESCE(@rem_appro, remarques_appro),
              remarques_technique = COALESCE(@rem_tech, remarques_technique),
              remarques_magasin = COALESCE(@rem_mag, remarques_magasin),
              decision_technique = COALESCE(@dec_tech, decision_technique),
              decision_magasin = COALESCE(@dec_mag, decision_magasin)
          WHERE id = @bon_id
        `);

      if (linesToSave) {
        await pool.request().input('bon_id', sql.Int, bon_id).query(`DELETE FROM BonReceptionLignes WHERE bon_reception_id = @bon_id`);

        for (let idx = 0; idx < linesToSave.length; idx++) {
          const it = linesToSave[idx];
          const code = String(it.code_article || '').trim() || `ART-${idx + 1}`;
          const desig = String(it.designation_article || '').trim() || `Article ${idx + 1}`;
          const cmd = String(it.numero_commande || '').trim();
          const sap = String(it.numero_commande_sap || '').trim();
          const qtyAtt = parseFloat(it.quantite_attendue) || 0;
          const qtyMag = it.quantite_recue_magasin !== undefined && it.quantite_recue_magasin !== null && it.quantite_recue_magasin !== ''
            ? parseFloat(it.quantite_recue_magasin)
            : null;
          const uom = String(it.unite_mesure || 'pce').trim() || 'pce';
          const stTech = String(it.statut_technique || 'EN_ATTENTE').trim();
          const stMag = String(it.statut_magasin || 'EN_ATTENTE').trim();
          const defauts = it.defauts_trouves !== undefined && it.defauts_trouves !== null ? parseInt(String(it.defauts_trouves), 10) : 0;
          const comTech = (it.remarques_technique !== undefined ? it.remarques_technique : it.commentaire_technique) ? String(it.remarques_technique || it.commentaire_technique).trim() : null;
          const remMag = it.remarques_magasin ? String(it.remarques_magasin).trim() : null;

          await pool.request()
            .input('bon_id', sql.Int, bon_id)
            .input('ligne_num', sql.Int, idx + 1)
            .input('code', sql.NVarChar, code)
            .input('desig', sql.NVarChar, desig)
            .input('cmd', sql.NVarChar, cmd)
            .input('sap', sql.NVarChar, sap)
            .input('qty_att', sql.Decimal(18, 3), qtyAtt)
            .input('qty_mag', sql.Decimal(18, 3), qtyMag)
            .input('uom', sql.NVarChar, uom)
            .input('st_tech', sql.NVarChar, stTech)
            .input('st_mag', sql.NVarChar, stMag)
            .input('defauts', sql.Int, defauts)
            .input('rem_tech', sql.NVarChar, comTech)
            .input('rem_mag', sql.NVarChar, remMag)
            .query(`
              INSERT INTO BonReceptionLignes (
                bon_reception_id, ligne_numero, code_article, designation_article,
                numero_commande, numero_commande_sap, quantite_attendue, quantite_recue_magasin,
                unite_mesure, statut_technique, statut_magasin, defauts_trouves,
                remarques_technique, commentaire_technique, remarques_magasin
              ) VALUES (
                @bon_id, @ligne_num, @code, @desig,
                @cmd, @sap, @qty_att, @qty_mag,
                @uom, @st_tech, @st_mag, @defauts,
                @rem_tech, @rem_tech, @rem_mag
              )
            `);
        }
      }

      actionDetails = `Modification administrateur complète effectuée par ${user_nom}`;
    }

    // Insert history
    await pool.request()
      .input('bon_id', sql.Int, bon_id)
      .input('details', sql.NVarChar, actionDetails)
      .input('user_id', sql.Int, user_id)
      .input('user_nom', sql.NVarChar, user_nom)
      .input('role', sql.NVarChar, user_role)
      .query(`
        INSERT INTO HistoriqueTracabilite (bon_reception_id, action, details, effectue_par_id, effectue_par_nom, role_utilisateur)
        VALUES (@bon_id, 'MODIFICATION_RECEPTION', @details, @user_id, @user_nom, @role)
      `);

    return res.json({ success: true, message: 'Bon de réception mis à jour avec succès.' });
  } catch (err: any) {
    console.error('Error in updateReception:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function deleteReception(req: Request, res: Response) {
  try {
    const bon_id = parseInt(req.params.id, 10);
    const pool = await getPool();

    // Delete related records
    await pool.request().input('bon_id', sql.Int, bon_id).query(`DELETE FROM HistoriqueTracabilite WHERE bon_reception_id = @bon_id`);
    await pool.request().input('bon_id', sql.Int, bon_id).query(`DELETE FROM Notifications WHERE bon_reception_id = @bon_id`);
    await pool.request().input('bon_id', sql.Int, bon_id).query(`DELETE FROM BonReceptionLignes WHERE bon_reception_id = @bon_id`);
    const delRes = await pool.request().input('bon_id', sql.Int, bon_id).query(`DELETE FROM BonsReception WHERE id = @bon_id`);

    if (delRes.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Bon de réception non trouvé' });
    }

    return res.json({ success: true, message: 'Bon de réception supprimé avec succès.' });
  } catch (err: any) {
    console.error('Error in deleteReception:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
