const { getPool, sql } = require('../../dist/config/db');

async function setupCaissesTable() {
  console.log('Connecting to database...');
  const pool = await getPool();

  console.log('Creating Caisses table if not exists...');
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('Caisses') AND type in (N'U'))
    BEGIN
      CREATE TABLE Caisses (
        id INT IDENTITY(1,1) PRIMARY KEY,
        code_caisse NVARCHAR(100) NOT NULL,
        numero_lot_fournisseur NVARCHAR(100) NOT NULL,
        reception_id INT NOT NULL,
        reception_ligne_id INT NOT NULL,
        numero_reception NVARCHAR(50) NOT NULL,
        article_code NVARCHAR(50) NOT NULL,
        designation NVARCHAR(255) NULL,
        fournisseur NVARCHAR(100) NULL,
        quantite FLOAT NOT NULL,
        statut NVARCHAR(50) NOT NULL DEFAULT 'DISPONIBLE', -- 'DISPONIBLE', 'SORTI'
        date_scan DATETIME NOT NULL DEFAULT GETDATE(),
        scanne_par NVARCHAR(100) NULL,
        code_qr_raw NVARCHAR(500) NULL
      );

      CREATE INDEX IX_Caisses_Reception ON Caisses(reception_id);
      CREATE INDEX IX_Caisses_Lot ON Caisses(numero_lot_fournisseur);
      CREATE INDEX IX_Caisses_Article ON Caisses(article_code);
      CREATE INDEX IX_Caisses_Code ON Caisses(code_caisse);
      
      PRINT 'Table Caisses created successfully with indexes!';
    END
    ELSE
    BEGIN
      PRINT 'Table Caisses already exists.';
    END
  `);

  console.log('Setup finished successfully!');
  process.exit(0);
}

setupCaissesTable().catch(err => {
  console.error('Setup Caisses failed:', err);
  process.exit(1);
});
