import { Request, Response } from 'express';
import { getPool, sql } from '../config/db';

export async function getUsers(req: Request, res: Response) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, username, full_name, role, email, is_active, created_at, last_login
      FROM Users
      ORDER BY id ASC
    `);
    return res.json(result.recordset);
  } catch (err: any) {
    console.error('Error in getUsers:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const { username, password, full_name, role, email, is_active } = req.body || {};
    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Champs obligatoires manquants (username, password, full_name, role).' });
    }

    const pool = await getPool();

    // Check unique username
    const check = await pool.request()
      .input('username', sql.NVarChar, String(username).trim())
      .query(`SELECT id FROM Users WHERE username = @username`);

    if (check.recordset.length > 0) {
      return res.status(400).json({ error: "Ce nom d'utilisateur est déjà utilisé." });
    }

    const insert = await pool.request()
      .input('username', sql.NVarChar, String(username).trim())
      .input('pwd', sql.NVarChar, String(password).trim())
      .input('full_name', sql.NVarChar, String(full_name).trim())
      .input('role', sql.NVarChar, String(role).trim())
      .input('email', sql.NVarChar, String(email || '').trim())
      .input('is_active', sql.Bit, is_active !== false ? 1 : 0)
      .query(`
        INSERT INTO Users (username, password_hash, full_name, role, email, is_active, created_at)
        OUTPUT INSERTED.id
        VALUES (@username, @pwd, @full_name, @role, @email, @is_active, GETDATE())
      `);

    return res.json({
      success: true,
      user_id: insert.recordset[0].id,
      message: 'Utilisateur créé avec succès.'
    });
  } catch (err: any) {
    console.error('Error in createUser:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const user_id = parseInt(req.params.id, 10);
    const { password, full_name, role, email, is_active } = req.body || {};

    const pool = await getPool();

    if (password && String(password).trim()) {
      await pool.request()
        .input('user_id', sql.Int, user_id)
        .input('pwd', sql.NVarChar, String(password).trim())
        .input('full_name', sql.NVarChar, String(full_name).trim())
        .input('role', sql.NVarChar, String(role).trim())
        .input('email', sql.NVarChar, String(email || '').trim())
        .input('is_active', sql.Bit, is_active !== false ? 1 : 0)
        .query(`
          UPDATE Users 
          SET password_hash = @pwd, full_name = @full_name, role = @role, email = @email, is_active = @is_active 
          WHERE id = @user_id
        `);
    } else {
      await pool.request()
        .input('user_id', sql.Int, user_id)
        .input('full_name', sql.NVarChar, String(full_name).trim())
        .input('role', sql.NVarChar, String(role).trim())
        .input('email', sql.NVarChar, String(email || '').trim())
        .input('is_active', sql.Bit, is_active !== false ? 1 : 0)
        .query(`
          UPDATE Users 
          SET full_name = @full_name, role = @role, email = @email, is_active = @is_active 
          WHERE id = @user_id
        `);
    }

    return res.json({ success: true, message: 'Utilisateur mis à jour avec succès.' });
  } catch (err: any) {
    console.error('Error in updateUser:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const user_id = parseInt(req.params.id, 10);
    const pool = await getPool();

    const userRes = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`SELECT role, username FROM Users WHERE id = @user_id`);

    const user = userRes.recordset[0];
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.role === 'admin') {
      const countRes = await pool.request().query(`SELECT COUNT(*) AS c FROM Users WHERE role = 'admin'`);
      if (countRes.recordset[0].c <= 1) {
        return res.status(400).json({ error: 'Impossible de supprimer le dernier compte Administrateur.' });
      }
    }

    await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`DELETE FROM Users WHERE id = @user_id`);

    return res.json({ success: true, message: 'Utilisateur supprimé.' });
  } catch (err: any) {
    console.error('Error in deleteUser:', err);
    return res.status(500).json({ error: err.message });
  }
}

