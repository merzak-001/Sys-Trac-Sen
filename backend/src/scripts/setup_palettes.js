const { getPool, sql } = require('../../dist/config/db');

async function setup() {
  console.log('Connecting to database...');
  const pool = await getPool();

  // 1. Fix user names UTF-8
  console.log('Updating user names encoding...');
  await pool.request().query(`
    UPDATE Users SET full_name = N'Responsable Contrôle Technique' WHERE username = 'technique';
    UPDATE Users SET full_name = N'Administrateur Système Sensus' WHERE username = 'admin';
    UPDATE Users SET full_name = N'Agent Approvisionnement' WHERE username = 'appro';
    UPDATE Users SET full_name = N'Gestionnaire Magasin' WHERE username = 'magasin';
  `);

  // 2. Add emplacement & nombre_palettes to BonReceptionLignes if not exists
  console.log('Checking and altering BonReceptionLignes columns...');
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BonReceptionLignes') AND name = 'emplacement')
    BEGIN
      ALTER TABLE BonReceptionLignes ADD emplacement NVARCHAR(100) NULL;
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BonReceptionLignes') AND name = 'nombre_palettes')
    BEGIN
      ALTER TABLE BonReceptionLignes ADD nombre_palettes INT DEFAULT 1;
    END
  `);

  // 3. Create Palettes table
  console.log('Creating Palettes table if not exists...');
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('Palettes') AND type in (N'U'))
    BEGIN
      CREATE TABLE Palettes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        code_palette NVARCHAR(50) NOT NULL UNIQUE,
        reception_id INT NOT NULL,
        reception_ligne_id INT NOT NULL,
        numero_reception NVARCHAR(50) NOT NULL,
        article_code NVARCHAR(50) NOT NULL,
        designation NVARCHAR(255) NULL,
        fournisseur NVARCHAR(100) NULL,
        quantite FLOAT NOT NULL,
        statut NVARCHAR(50) NOT NULL DEFAULT 'DISPONIBLE', -- 'DISPONIBLE', 'SORTI_PRODUCTION', 'REBUT'
        emplacement NVARCHAR(100) NULL,
        date_entree_magasin DATETIME NOT NULL DEFAULT GETDATE(),
        date_sortie DATETIME NULL,
        destination_ligne NVARCHAR(100) NULL,
        num_of NVARCHAR(50) NULL,
        operateur_magasin NVARCHAR(100) NULL,
        remarques NVARCHAR(500) NULL,
        code_qr_data NVARCHAR(1000) NULL
      );

      CREATE INDEX IX_Palettes_Statut ON Palettes(statut);
      CREATE INDEX IX_Palettes_Article ON Palettes(article_code);
      CREATE INDEX IX_Palettes_Reception ON Palettes(reception_id);
    END
  `);

  // 4. Backfill any existing validated receptions into Palettes if not already present
  console.log('Backfilling Palettes from existing validated receptions...');
  await pool.request().query(`
    INSERT INTO Palettes (
      code_palette, reception_id, reception_ligne_id, numero_reception, 
      article_code, designation, fournisseur, quantite, statut, 
      emplacement, date_entree_magasin, operateur_magasin, remarques, code_qr_data
    )
    SELECT 
      CONCAT('PAL-', FORMAT(b.date_reception, 'yyyy'), '-', RIGHT(CONCAT('0000', l.id), 4)) AS code_palette,
      b.id AS reception_id,
      l.id AS reception_ligne_id,
      b.numero_reception,
      COALESCE(l.code_article, 'N/A') AS article_code,
      COALESCE(l.designation_article, 'N/A') AS designation,
      b.fournisseur,
      COALESCE(l.quantite_recue_magasin, l.quantite_attendue) AS quantite,
      'DISPONIBLE' AS statut,
      COALESCE(l.emplacement, 'Zone Magasin') AS emplacement,
      COALESCE(b.date_validation_magasin, b.date_creation) AS date_entree_magasin,
      COALESCE(u_mag.full_name, 'Magasinier Sensus') AS operateur_magasin,
      l.remarques_magasin,
      CONCAT('BR:', b.numero_reception, '|ART:', COALESCE(l.code_article, 'N/A'), '|QTE:', COALESCE(l.quantite_recue_magasin, l.quantite_attendue)) AS code_qr_data
    FROM BonReceptionLignes l
    INNER JOIN BonsReception b ON l.bon_reception_id = b.id
    LEFT JOIN Users u_mag ON b.valideur_magasin_id = u_mag.id
    WHERE b.statut = 'VALIDE_MAGASIN'
      AND NOT EXISTS (
        SELECT 1 FROM Palettes p WHERE p.reception_ligne_id = l.id
      );
  `);

  // Verify users
  const usersRes = await pool.request().query('SELECT id, username, full_name, role FROM Users');
  console.log('Users successfully updated:');
  console.log(usersRes.recordset);

  // Verify Palettes count
  const countRes = await pool.request().query('SELECT COUNT(*) AS total_palettes FROM Palettes');
  console.log('Palettes count:', countRes.recordset[0]);

  console.log('Setup finished successfully!');
  process.exit(0);
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
