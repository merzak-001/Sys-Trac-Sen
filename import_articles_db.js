const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('./backend/dist/config/db');

async function importArticles() {
  const jsonPath = path.join(__dirname, 'articles_extracted.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('File not found:', jsonPath);
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${articles.length} articles from JSON.`);

  const pool = await getPool();
  console.log('Connected to SQL Server.');

  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];
    const code = art.code.trim();
    const name = art.name.trim();
    const uom = (art.unite_mesure || 'pce').trim();

    // Check if code exists
    const checkRes = await pool.request()
      .input('code', sql.NVarChar, code)
      .query('SELECT id FROM Articles WHERE code = @code');

    if (checkRes.recordset.length > 0) {
      // Update
      await pool.request()
        .input('code', sql.NVarChar, code)
        .input('name', sql.NVarChar, name)
        .input('uom', sql.NVarChar, uom)
        .query(`
          UPDATE Articles
          SET name = @name,
              unite_mesure = @uom,
              date_updated = GETDATE()
          WHERE code = @code
        `);
      updated++;
    } else {
      // Insert
      await pool.request()
        .input('code', sql.NVarChar, code)
        .input('name', sql.NVarChar, name)
        .input('uom', sql.NVarChar, uom)
        .query(`
          INSERT INTO Articles (code, name, unite_mesure, date_created, date_updated)
          VALUES (@code, @name, @uom, GETDATE(), GETDATE())
        `);
      inserted++;
    }
  }

  console.log('========================================');
  console.log(`IMPORT COMPLETED SUCCESSFULLY:`);
  console.log(`- Total articles processed: ${articles.length}`);
  console.log(`- New articles inserted: ${inserted}`);
  console.log(`- Existing articles updated: ${updated}`);

  const totalInDbRes = await pool.request().query('SELECT COUNT(*) AS total FROM Articles');
  console.log(`- Total articles now in DB: ${totalInDbRes.recordset[0].total}`);
  console.log('========================================');

  process.exit(0);
}

importArticles().catch((err) => {
  console.error('Import error:', err);
  process.exit(1);
});

