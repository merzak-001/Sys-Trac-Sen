import { Request, Response } from 'express';
import { getPool, sql } from '../config/db';

export async function getPalettesDisponibles(req: Request, res: Response) {
  try {
    const search = String(req.query.search || '').trim();
    const emplacement = String(req.query.emplacement || '').trim();
    const article = String(req.query.article || '').trim();

    const pool = await getPool();
    let query = `
      SELECT p.id, p.code_palette, p.reception_id, p.reception_ligne_id,
             p.numero_reception, p.article_code, p.designation, p.fournisseur,
             p.quantite, p.statut, p.emplacement, p.date_entree_magasin,
             p.operateur_magasin, p.remarques, p.code_qr_data,
             DATEDIFF(day, p.date_entree_magasin, GETDATE()) AS jours_en_magasin
      FROM Palettes p
      WHERE p.statut = 'DISPONIBLE'
    `;

    const request = pool.request();

    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
      query += ` AND (
        p.code_palette LIKE @search OR
        p.article_code LIKE @search OR
        p.designation LIKE @search OR
        p.numero_reception LIKE @search OR
        p.fournisseur LIKE @search OR
        p.emplacement LIKE @search
      )`;
    }

    if (emplacement) {
      request.input('emplacement', sql.NVarChar, emplacement);
      query += ` AND p.emplacement = @emplacement`;
    }

    if (article) {
      request.input('article', sql.NVarChar, article);
      query += ` AND p.article_code = @article`;
    }

    query += ` ORDER BY p.date_entree_magasin DESC, p.id DESC`;

    const result = await request.query(query);

    // Summary statistics
    const statsRes = await pool.request().query(`
      SELECT 
        COUNT(*) AS total_palettes,
        COUNT(DISTINCT article_code) AS total_articles,
        COALESCE(SUM(quantite), 0) AS total_quantite,
        COUNT(DISTINCT emplacement) AS total_emplacements
      FROM Palettes
      WHERE statut = 'DISPONIBLE'
    `);

    // Unique emplacements list for filter dropdown
    const empRes = await pool.request().query(`
      SELECT DISTINCT emplacement 
      FROM Palettes 
      WHERE statut = 'DISPONIBLE' AND emplacement IS NOT NULL AND LTRIM(RTRIM(emplacement)) <> ''
      ORDER BY emplacement ASC
    `);

    return res.json({
      success: true,
      palettes: result.recordset,
      stats: statsRes.recordset[0] || {
        total_palettes: 0,
        total_articles: 0,
        total_quantite: 0,
        total_emplacements: 0
      },
      emplacements: empRes.recordset.map((r: any) => r.emplacement)
    });
  } catch (error: any) {
    console.error('Error in getPalettesDisponibles:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPalettesByReception(req: Request, res: Response) {
  try {
    const receptionId = parseInt(req.params.id, 10);
    const pool = await getPool();

    const result = await pool.request()
      .input('rec_id', sql.Int, receptionId)
      .query(`
        SELECT p.*,
               DATEDIFF(day, p.date_entree_magasin, GETDATE()) AS jours_en_magasin
        FROM Palettes p
        WHERE p.reception_id = @rec_id
        ORDER BY p.id ASC
      `);

    return res.json({
      success: true,
      palettes: result.recordset
    });
  } catch (error: any) {
    console.error('Error in getPalettesByReception:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function updatePalette(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const { emplacement, remarques } = req.body || {};

    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('emp', sql.NVarChar, emplacement || null)
      .input('rem', sql.NVarChar, remarques || null)
      .query(`
        UPDATE Palettes
        SET emplacement = COALESCE(@emp, emplacement),
            remarques = COALESCE(@rem, remarques)
        WHERE id = @id
      `);

    return res.json({ success: true, message: 'Palette mise à jour avec succès' });
  } catch (error: any) {
    console.error('Error in updatePalette:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

