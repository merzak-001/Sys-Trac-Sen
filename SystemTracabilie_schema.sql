-- =====================================================================
-- SystemTracabilie - Database Creation & Setup Script
-- Compatible with SQL Server 2017+ / SQL Server Express / Enterprise
-- =====================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SystemTracabilie')
BEGIN
    CREATE DATABASE [SystemTracabilie];
    PRINT 'Database [SystemTracabilie] created successfully.';
END
ELSE
BEGIN
    PRINT 'Database [SystemTracabilie] already exists.';
END
GO

USE [SystemTracabilie];
GO

-- 1. Table: Users
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Users] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [username] NVARCHAR(50) NOT NULL UNIQUE,
        [password_hash] NVARCHAR(255) NOT NULL,
        [full_name] NVARCHAR(100) NOT NULL,
        [role] NVARCHAR(30) NOT NULL, -- 'appro', 'technique', 'magasin', 'admin'
        [email] NVARCHAR(100),
        [is_active] BIT DEFAULT 1,
        [created_at] DATETIME DEFAULT GETDATE(),
        [last_login] DATETIME NULL
    );
    PRINT 'Table [Users] created.';
END
GO

-- 2. Table: BonsReception (Header)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BonsReception]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[BonsReception] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [numero_reception] NVARCHAR(50) NOT NULL UNIQUE,
        [fournisseur] NVARCHAR(150) NOT NULL,
        [date_reception] DATE NOT NULL,
        [date_creation] DATETIME DEFAULT GETDATE(),
        [statut] NVARCHAR(50) NOT NULL DEFAULT 'EN_ATTENTE_TECHNIQUE', 
        -- Values: 'EN_ATTENTE_TECHNIQUE', 'EN_COURS_TECHNIQUE', 'VALIDE_TECHNIQUE', 'VALIDE_MAGASIN', 'NON_CONFORME', 'ECART_MAGASIN'
        [cree_par_id] INT NULL FOREIGN KEY REFERENCES [dbo].[Users]([id]),
        [remarques_appro] NVARCHAR(MAX) NULL,
        
        -- Technique Section
        [date_validation_technique] DATETIME NULL,
        [valideur_technique_id] INT NULL FOREIGN KEY REFERENCES [dbo].[Users]([id]),
        [decision_technique] NVARCHAR(50) NULL, -- 'CONFORME', 'NON_CONFORME', 'AVEC_RESERVE'
        [remarques_technique] NVARCHAR(MAX) NULL,
        [duree_jours_technique] INT NULL,
        
        -- Magasin Section
        [date_validation_magasin] DATETIME NULL,
        [valideur_magasin_id] INT NULL FOREIGN KEY REFERENCES [dbo].[Users]([id]),
        [decision_magasin] NVARCHAR(50) NULL, -- 'CONFORME', 'AVEC_ECART', 'REFUSE'
        [remarques_magasin] NVARCHAR(MAX) NULL,
        [duree_jours_totale] INT NULL
    );
    PRINT 'Table [BonsReception] created.';
END
GO

-- 3. Table: BonReceptionLignes (Items per reception)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BonReceptionLignes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[BonReceptionLignes] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [bon_reception_id] INT NOT NULL FOREIGN KEY REFERENCES [dbo].[BonsReception]([id]) ON DELETE CASCADE,
        [ligne_numero] INT NOT NULL,
        [code_article] NVARCHAR(50) NOT NULL,
        [designation_article] NVARCHAR(250) NOT NULL,
        [numero_commande] NVARCHAR(50) NULL,
        [numero_commande_sap] NVARCHAR(50) NULL,
        [quantite_attendue] DECIMAL(18, 3) NOT NULL,
        [unite_mesure] NVARCHAR(20) NOT NULL DEFAULT 'pce',
        
        -- Controle Technique per item
        [statut_technique] NVARCHAR(50) NOT NULL DEFAULT 'EN_ATTENTE', -- 'EN_ATTENTE', 'CONFORME', 'NON_CONFORME', 'RESERVE'
        [remarques_technique] NVARCHAR(MAX) NULL,
        [defauts_trouves] INT DEFAULT 0,
        [date_controle_technique] DATETIME NULL,
        [controleur_technique_id] INT NULL FOREIGN KEY REFERENCES [dbo].[Users]([id]),
        
        -- Controle Magasin per item
        [quantite_recue_magasin] DECIMAL(18, 3) NULL,
        [statut_magasin] NVARCHAR(50) NOT NULL DEFAULT 'EN_ATTENTE', -- 'EN_ATTENTE', 'CONFORME', 'ECART', 'REFUSE'
        [remarques_magasin] NVARCHAR(MAX) NULL,
        [date_controle_magasin] DATETIME NULL,
        [controleur_magasin_id] INT NULL FOREIGN KEY REFERENCES [dbo].[Users]([id])
    );
    PRINT 'Table [BonReceptionLignes] created.';
END
GO

-- 4. Table: HistoriqueTracabilite (Audit Trail)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[HistoriqueTracabilite]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[HistoriqueTracabilite] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [bon_reception_id] INT NOT NULL FOREIGN KEY REFERENCES [dbo].[BonsReception]([id]) ON DELETE CASCADE,
        [action] NVARCHAR(100) NOT NULL,
        [details] NVARCHAR(MAX) NULL,
        [effectue_par_id] INT NULL FOREIGN KEY REFERENCES [dbo].[Users]([id]),
        [effectue_par_nom] NVARCHAR(100) NULL,
        [role_utilisateur] NVARCHAR(50) NULL,
        [timestamp] DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table [HistoriqueTracabilite] created.';
END
GO

-- 5. Table: Notifications (Cycle alerts)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Notifications] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [titre] NVARCHAR(150) NOT NULL,
        [message] NVARCHAR(MAX) NOT NULL,
        [role_destinataire] NVARCHAR(50) NOT NULL, -- 'technique', 'magasin', 'appro', 'all'
        [bon_reception_id] INT NULL FOREIGN KEY REFERENCES [dbo].[BonsReception]([id]) ON DELETE CASCADE,
        [lu] BIT DEFAULT 0,
        [date_creation] DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table [Notifications] created.';
END
GO

-- Seed default users if empty
IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [username] = 'appro')
BEGIN
    INSERT INTO [dbo].[Users] ([username], [password_hash], [full_name], [role], [email], [is_active])
    VALUES ('appro', 'appro123', 'Agent Approvisionnement', 'appro', 'appro@sensus.com', 1);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [username] = 'technique')
BEGIN
    INSERT INTO [dbo].[Users] ([username], [password_hash], [full_name], [role], [email], [is_active])
    VALUES ('technique', 'tech123', 'Responsable Contrôle Technique', 'technique', 'technique@sensus.com', 1);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [username] = 'magasin')
BEGIN
    INSERT INTO [dbo].[Users] ([username], [password_hash], [full_name], [role], [email], [is_active])
    VALUES ('magasin', 'mag123', 'Gestionnaire Magasin', 'magasin', 'magasin@sensus.com', 1);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [username] = 'admin')
BEGIN
    INSERT INTO [dbo].[Users] ([username], [password_hash], [full_name], [role], [email], [is_active])
    VALUES ('admin', 'admin123', 'Administrateur Système Sensus', 'admin', 'admin@sensus.com', 1);
END
GO

-- Seed sample data from Réactivité des Bons réceptions 2026.xlsx
IF NOT EXISTS (SELECT 1 FROM [dbo].[BonsReception] WHERE [numero_reception] = '5002223086')
BEGIN
    DECLARE @ApproUserId INT;
    SELECT TOP 1 @ApproUserId = [id] FROM [dbo].[Users] WHERE [username] = 'appro';

    INSERT INTO [dbo].[BonsReception] (
        [numero_reception], [fournisseur], [date_reception], [date_creation], 
        [statut], [cree_par_id], [remarques_appro]
    )
    VALUES (
        '5002223086', 'SLR', '2026-01-04', '2026-01-04 08:30:00', 
        'EN_ATTENTE_TECHNIQUE', @ApproUserId, 'Livraison arrivage matin - palette 1 à 4'
    );

    DECLARE @BonId INT = SCOPE_IDENTITY();

    INSERT INTO [dbo].[BonReceptionLignes] (
        [bon_reception_id], [ligne_numero], [code_article], [designation_article],
        [numero_commande], [numero_commande_sap], [quantite_attendue], [unite_mesure]
    )
    VALUES 
    (@BonId, 1, '48115600', 'tete laiton', '45761005', 'SAP-45761005', 20184.000, 'pce'),
    (@BonId, 2, '78182331', 'bouchon de réglage M10x1', '45761005', 'SAP-45761005', 50000.000, 'pce'),
    (@BonId, 3, '1023205', 'ecrou raccord 3/4"', '45761005', 'SAP-45761005', 25000.000, 'pce'),
    (@BonId, 4, '1023036', 'douille 1/2"', '45761005', 'SAP-45761005', 25000.000, 'pce'),
    (@BonId, 5, '1023206', 'ecrou raccord 1"', '45761005', 'SAP-45761005', 13000.000, 'pce');

    INSERT INTO [dbo].[HistoriqueTracabilite] ([bon_reception_id], [action], [details], [effectue_par_id], [effectue_par_nom], [role_utilisateur])
    VALUES (@BonId, 'CREATION_RECEPTION', 'Création du Bon de Réception 5002223086 avec 5 articles', @ApproUserId, 'Agent Approvisionnement', 'appro');

    INSERT INTO [dbo].[Notifications] ([titre], [message], [role_destinataire], [bon_reception_id])
    VALUES ('Nouveau Bon de Réception', 'Le Bon de Réception N° 5002223086 (Fournisseur: SLR, 5 articles) est en attente de Contrôle Technique.', 'technique', @BonId);
END
GO

PRINT 'SystemTracabilie setup completed successfully!';

