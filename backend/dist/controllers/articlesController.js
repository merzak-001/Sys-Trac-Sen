"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArticles = getArticles;
exports.getArticleById = getArticleById;
exports.createArticle = createArticle;
exports.updateArticle = updateArticle;
exports.deleteArticle = deleteArticle;
const db_1 = require("../config/db");
async function getArticles(req, res) {
    try {
        const search = String(req.query.search || '').trim();
        const pool = await (0, db_1.getPool)();
        const request = pool.request();
        let query = `
      SELECT id, code, name, unite_mesure, date_created, date_updated
      FROM Articles
      WHERE 1=1
    `;
        if (search) {
            request.input('search', db_1.sql.NVarChar, `%${search}%`);
            query += ` AND (code LIKE @search OR name LIKE @search)`;
        }
        query += ` ORDER BY name ASC`;
        const result = await request.query(query);
        return res.json(result.recordset);
    }
    catch (err) {
        console.error('Error in getArticles:', err);
        return res.status(500).json({ error: err.message });
    }
}
async function getArticleById(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        const pool = await (0, db_1.getPool)();
        const result = await pool.request()
            .input('id', db_1.sql.Int, id)
            .query(`SELECT id, code, name, unite_mesure, date_created, date_updated FROM Articles WHERE id = @id`);
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        return res.json(result.recordset[0]);
    }
    catch (err) {
        console.error('Error in getArticleById:', err);
        return res.status(500).json({ error: err.message });
    }
}
async function createArticle(req, res) {
    try {
        const { code, name, unite_mesure } = req.body;
        if (!code || !name) {
            return res.status(400).json({ error: 'Code et nom (désignation) requis' });
        }
        const cleanCode = String(code).trim();
        const cleanName = String(name).trim();
        const cleanUnite = String(unite_mesure || 'pce').trim();
        const pool = await (0, db_1.getPool)();
        // Check duplicate code
        const check = await pool.request()
            .input('code', db_1.sql.NVarChar, cleanCode)
            .query(`SELECT id FROM Articles WHERE code = @code`);
        if (check.recordset.length > 0) {
            return res.status(400).json({ error: `Le code article "${cleanCode}" existe déjà.` });
        }
        const insertResult = await pool.request()
            .input('code', db_1.sql.NVarChar, cleanCode)
            .input('name', db_1.sql.NVarChar, cleanName)
            .input('unite_mesure', db_1.sql.NVarChar, cleanUnite)
            .query(`
        INSERT INTO Articles (code, name, unite_mesure, date_created, date_updated)
        OUTPUT INSERTED.*
        VALUES (@code, @name, @unite_mesure, GETDATE(), GETDATE())
      `);
        return res.status(201).json(insertResult.recordset[0]);
    }
    catch (err) {
        console.error('Error in createArticle:', err);
        return res.status(500).json({ error: err.message });
    }
}
async function updateArticle(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        const { code, name, unite_mesure } = req.body;
        if (!code || !name) {
            return res.status(400).json({ error: 'Code et nom requis' });
        }
        const cleanCode = String(code).trim();
        const cleanName = String(name).trim();
        const cleanUnite = String(unite_mesure || 'pce').trim();
        const pool = await (0, db_1.getPool)();
        // Check if code used by another article
        const check = await pool.request()
            .input('code', db_1.sql.NVarChar, cleanCode)
            .input('id', db_1.sql.Int, id)
            .query(`SELECT id FROM Articles WHERE code = @code AND id != @id`);
        if (check.recordset.length > 0) {
            return res.status(400).json({ error: `Le code article "${cleanCode}" est déjà utilisé.` });
        }
        const updateResult = await pool.request()
            .input('id', db_1.sql.Int, id)
            .input('code', db_1.sql.NVarChar, cleanCode)
            .input('name', db_1.sql.NVarChar, cleanName)
            .input('unite_mesure', db_1.sql.NVarChar, cleanUnite)
            .query(`
        UPDATE Articles
        SET code = @code, name = @name, unite_mesure = @unite_mesure, date_updated = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
        if (updateResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        return res.json(updateResult.recordset[0]);
    }
    catch (err) {
        console.error('Error in updateArticle:', err);
        return res.status(500).json({ error: err.message });
    }
}
async function deleteArticle(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        const pool = await (0, db_1.getPool)();
        // Check if referenced in LignesCommande
        const refCheck = await pool.request()
            .input('id', db_1.sql.Int, id)
            .query(`SELECT TOP 1 id FROM LignesCommande WHERE article_id = @id`);
        if (refCheck.recordset.length > 0) {
            return res.status(400).json({
                error: 'Impossible de supprimer cet article car il est rattaché à une ou plusieurs commandes.'
            });
        }
        const result = await pool.request()
            .input('id', db_1.sql.Int, id)
            .query(`DELETE FROM Articles WHERE id = @id`);
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        return res.json({ message: 'Article supprimé avec succès' });
    }
    catch (err) {
        console.error('Error in deleteArticle:', err);
        return res.status(500).json({ error: err.message });
    }
}
