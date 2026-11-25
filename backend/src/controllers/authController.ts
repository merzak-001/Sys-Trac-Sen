import { Request, Response } from 'express';
import { getPool, sql } from '../config/db';

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Identifiant et mot de passe requis' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, String(username).trim())
      .query(`
        SELECT id, username, password_hash, full_name, role, email, is_active
        FROM Users
        WHERE username = @username
      `);

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ success: false, error: 'Identifiant ou mot de passe incorrect' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'Ce compte utilisateur a été désactivé' });
    }

    if (user.password_hash !== String(password).trim()) {
      return res.status(401).json({ success: false, error: 'Identifiant ou mot de passe incorrect' });
    }

    delete user.password_hash;
    return res.json({
      success: true,
      user
    });
  } catch (error: any) {
    console.error('Error in login:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

