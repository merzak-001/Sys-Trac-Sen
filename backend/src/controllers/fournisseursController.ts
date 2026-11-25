import { Request, Response } from 'express';
import { getPool, sql } from '../config/db';

export async function getFournisseurs(req: Request, res: Response) {
  try {
    const search = String(req.query.search || '').trim();
    const asList = req.query.format === 'simple'; // Returns string array if requested for backwards compatibility

    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT id, code, name, date_created, date_updated
      FROM Fournisseurs
      WHERE 1=1
    `;

    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
      query += ` AND (code LIKE @search OR name LIKE @search)`;
    }

    query += ` ORDER BY name ASC`;

    const result = await request.query(query);

    if (asList) {
      return res.json(result.recordset.map((r: any) => r.name));
    }

    return res.json(result.recordset);
  } catch (err: any) {
    console.error('Error in getFournisseurs:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getFournisseurById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT id, code, name, date_created, date_updated FROM Fournisseurs WHERE id = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }

    return res.json(result.recordset[0]);
  } catch (err: any) {
    console.error('Error in getFournisseurById:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function createFournisseur(req: Request, res: Response) {
  try {
    const { code, name } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Code et nom (raison sociale) requis' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const cleanName = String(name).trim();

    const pool = await getPool();

    // Check duplicate code
    const check = await pool.request()
      .input('code', sql.NVarChar, cleanCode)
      .query(`SELECT id FROM Fournisseurs WHERE code = @code`);

    if (check.recordset.length > 0) {
      return res.status(400).json({ error: `Le code fournisseur "${cleanCode}" existe déjà.` });
    }

    const insertResult = await pool.request()
      .input('code', sql.NVarChar, cleanCode)
      .input('name', sql.NVarChar, cleanName)
      .query(`
        INSERT INTO Fournisseurs (code, name, date_created, date_updated)
        OUTPUT INSERTED.*
        VALUES (@code, @name, GETDATE(), GETDATE())
      `);

    return res.status(201).json(insertResult.recordset[0]);
  } catch (err: any) {
    console.error('Error in createFournisseur:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function updateFournisseur(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const { code, name } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code et nom requis' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const cleanName = String(name).trim();

    const pool = await getPool();

    const check = await pool.request()
      .input('code', sql.NVarChar, cleanCode)
      .input('id', sql.Int, id)
      .query(`SELECT id FROM Fournisseurs WHERE code = @code AND id != @id`);

    if (check.recordset.length > 0) {
      return res.status(400).json({ error: `Le code fournisseur "${cleanCode}" est déjà utilisé.` });
    }

    const updateResult = await pool.request()
      .input('id', sql.Int, id)
      .input('code', sql.NVarChar, cleanCode)
      .input('name', sql.NVarChar, cleanName)
      .query(`
        UPDATE Fournisseurs
        SET code = @code, name = @name, date_updated = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (updateResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }

    return res.json(updateResult.recordset[0]);
  } catch (err: any) {
    console.error('Error in updateFournisseur:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteFournisseur(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const pool = await getPool();

    // Check if referenced in Commandes
    const refCheck = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT TOP 1 id FROM Commandes WHERE fournisseur_id = @id`);

    if (refCheck.recordset.length > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer ce fournisseur car il est associé à une ou plusieurs commandes.'
      });
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM Fournisseurs WHERE id = @id`);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }

    return res.json({ message: 'Fournisseur supprimé avec succès' });
  } catch (err: any) {
    console.error('Error in deleteFournisseur:', err);
    return res.status(500).json({ error: err.message });
  }
}

