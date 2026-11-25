"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = getUsers;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
const db_1 = require("../config/db");
async function getUsers(req, res) {
    try {
        const pool = await (0, db_1.getPool)();
        const result = await pool.request().query(`
      SELECT id, username, full_name, role, email, is_active, created_at, last_login
      FROM Users
      ORDER BY id ASC
    `);
        return res.json(result.recordset);
    }
    catch (err) {
        console.error('Error in getUsers:', err);
        return res.status(500).json({ error: err.message });
    }
}
async function createUser(req, res) {
    try {
        const { username, password, full_name, role, email, is_active } = req.body || {};
        if (!username || !password || !full_name || !role) {
            return res.status(400).json({ error: 'Champs obligatoires manquants (username, password, full_name, role).' });
        }
        const pool = await (0, db_1.getPool)();
        // Check unique username
        const check = await pool.request()
            .input('username', db_1.sql.NVarChar, String(username).trim())
            .query(`SELECT id FROM Users WHERE username = @username`);
        if (check.recordset.length > 0) {
            return res.status(400).json({ error: "Ce nom d'utilisateur est déjà utilisé." });
        }
        const insert = await pool.request()
            .input('username', db_1.sql.NVarChar, String(username).trim())
            .input('pwd', db_1.sql.NVarChar, String(password).trim())
            .input('full_name', db_1.sql.NVarChar, String(full_name).trim())
            .input('role', db_1.sql.NVarChar, String(role).trim())
            .input('email', db_1.sql.NVarChar, String(email || '').trim())
            .input('is_active', db_1.sql.Bit, is_active !== false ? 1 : 0)
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
    }
    catch (err) {
        console.error('Error in createUser:', err);
        return res.status(500).json({ error: err.message });
    }
}
async function updateUser(req, res) {
    try {
        const user_id = parseInt(req.params.id, 10);
        const { password, full_name, role, email, is_active } = req.body || {};
        const pool = await (0, db_1.getPool)();
        if (password && String(password).trim()) {
            await pool.request()
                .input('user_id', db_1.sql.Int, user_id)
                .input('pwd', db_1.sql.NVarChar, String(password).trim())
                .input('full_name', db_1.sql.NVarChar, String(full_name).trim())
                .input('role', db_1.sql.NVarChar, String(role).trim())
                .input('email', db_1.sql.NVarChar, String(email || '').trim())
                .input('is_active', db_1.sql.Bit, is_active !== false ? 1 : 0)
                .query(`
          UPDATE Users 
          SET password_hash = @pwd, full_name = @full_name, role = @role, email = @email, is_active = @is_active 
          WHERE id = @user_id
        `);
        }
        else {
            await pool.request()
                .input('user_id', db_1.sql.Int, user_id)
                .input('full_name', db_1.sql.NVarChar, String(full_name).trim())
                .input('role', db_1.sql.NVarChar, String(role).trim())
                .input('email', db_1.sql.NVarChar, String(email || '').trim())
                .input('is_active', db_1.sql.Bit, is_active !== false ? 1 : 0)
                .query(`
          UPDATE Users 
          SET full_name = @full_name, role = @role, email = @email, is_active = @is_active 
          WHERE id = @user_id
        `);
        }
        return res.json({ success: true, message: 'Utilisateur mis à jour avec succès.' });
    }
    catch (err) {
        console.error('Error in updateUser:', err);
        return res.status(500).json({ error: err.message });
    }
}
async function deleteUser(req, res) {
    try {
        const user_id = parseInt(req.params.id, 10);
        const pool = await (0, db_1.getPool)();
        const userRes = await pool.request()
            .input('user_id', db_1.sql.Int, user_id)
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
            .input('user_id', db_1.sql.Int, user_id)
            .query(`DELETE FROM Users WHERE id = @user_id`);
        return res.json({ success: true, message: 'Utilisateur supprimé.' });
    }
    catch (err) {
        console.error('Error in deleteUser:', err);
        return res.status(500).json({ error: err.message });
    }
}
