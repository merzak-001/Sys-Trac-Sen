USE [SystemTracabilie];
GO

-- 1. Table: Articles
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Articles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Articles] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [code] NVARCHAR(50) NOT NULL UNIQUE,
        [name] NVARCHAR(255) NOT NULL,
        [unite_mesure] NVARCHAR(20) NOT NULL DEFAULT 'pce',
        [date_created] DATETIME DEFAULT GETDATE(),
        [date_updated] DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table [Articles] created.';
END
GO

-- 2. Table: Fournisseurs
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Fournisseurs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Fournisseurs] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [code] NVARCHAR(50) NOT NULL UNIQUE,
        [name] NVARCHAR(255) NOT NULL,
        [date_created] DATETIME DEFAULT GETDATE(),
        [date_updated] DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table [Fournisseurs] created.';
END
GO

-- 3. Table: Commandes (Not commande SAP)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Commandes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Commandes] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [numero_commande] NVARCHAR(50) NOT NULL UNIQUE,
        [date_commande] DATE NOT NULL,
        [ref_sap] NVARCHAR(100) NULL,
        [fournisseur_id] INT NULL FOREIGN KEY REFERENCES [dbo].[Fournisseurs]([id]),
        [fournisseur_nom] NVARCHAR(255) NOT NULL,
        [statut] NVARCHAR(50) NOT NULL DEFAULT 'EN_COURS', -- 'EN_COURS', 'RECU_PARTIEL', 'RECU_TOTAL', 'ANNULE'
        [date_created] DATETIME DEFAULT GETDATE(),
        [date_updated] DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table [Commandes] created.';
END
GO

-- 4. Table: LignesCommande
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LignesCommande]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[LignesCommande] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [commande_id] INT NOT NULL FOREIGN KEY REFERENCES [dbo].[Commandes]([id]) ON DELETE CASCADE,
        [ligne_numero] INT NOT NULL,
        [article_id] INT NULL FOREIGN KEY REFERENCES [dbo].[Articles]([id]),
        [code_article] NVARCHAR(50) NOT NULL,
        [designation_article] NVARCHAR(255) NOT NULL,
        [quantite_commandee] DECIMAL(18, 3) NOT NULL,
        [unite_mesure] NVARCHAR(20) NOT NULL DEFAULT 'pce',
        [quantite_deja_recue] DECIMAL(18, 3) NOT NULL DEFAULT 0
    );
    PRINT 'Table [LignesCommande] created.';
END
GO

-- Seed sample data if empty
IF NOT EXISTS (SELECT 1 FROM [dbo].[Fournisseurs])
BEGIN
    INSERT INTO [dbo].[Fournisseurs] ([code], [name]) VALUES
    ('F001', 'SLR INDUSTRIE'),
    ('F002', 'KDI DISTRIBUTION'),
    ('F003', 'SCHNEIDER ELECTRIC'),
    ('F004', 'WURTH FRANCE');
    PRINT 'Seed data inserted into [Fournisseurs].';
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[Articles])
BEGIN
    INSERT INTO [dbo].[Articles] ([code], [name], [unite_mesure]) VALUES
    ('48115600', 'Tete laiton D25', 'pce'),
    ('78182331', 'Bouchon de reglage M10x1', 'pce'),
    ('32001450', 'Joint torique NBR 70', 'pce'),
    ('11005892', 'Vis CHC M6x20 Inox A2', 'pce'),
    ('65492100', 'Corps de vanne Fonte DN50', 'pce');
    PRINT 'Seed data inserted into [Articles].';
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[Commandes])
BEGIN
    DECLARE @slrId INT = (SELECT TOP 1 id FROM [dbo].[Fournisseurs] WHERE code = 'F001');
    DECLARE @cmdId INT;

    INSERT INTO [dbo].[Commandes] ([numero_commande], [date_commande], [ref_sap], [fournisseur_id], [fournisseur_nom], [statut])
    VALUES ('CMD-2026-001', '2026-11-17', 'SAP-45761005', @slrId, 'SLR INDUSTRIE', 'EN_COURS');
    SET @cmdId = SCOPE_IDENTITY();

    INSERT INTO [dbo].[LignesCommande] ([commande_id], [ligne_numero], [code_article], [designation_article], [quantite_commandee], [unite_mesure])
    VALUES
    (@cmdId, 1, '48115600', 'Tete laiton D25', 20184, 'pce'),
    (@cmdId, 2, '78182331', 'Bouchon de reglage M10x1', 50000, 'pce');

    DECLARE @schId INT = (SELECT TOP 1 id FROM [dbo].[Fournisseurs] WHERE code = 'F003');
    DECLARE @cmd2Id INT;

    INSERT INTO [dbo].[Commandes] ([numero_commande], [date_commande], [ref_sap], [fournisseur_id], [fournisseur_nom], [statut])
    VALUES ('CMD-2026-002', '2026-11-16', 'SAP-45762010', @schId, 'SCHNEIDER ELECTRIC', 'EN_COURS');
    SET @cmd2Id = SCOPE_IDENTITY();

    INSERT INTO [dbo].[LignesCommande] ([commande_id], [ligne_numero], [code_article], [designation_article], [quantite_commandee], [unite_mesure])
    VALUES
    (@cmd2Id, 1, '32001450', 'Joint torique NBR 70', 1500, 'pce'),
    (@cmd2Id, 2, '11005892', 'Vis CHC M6x20 Inox A2', 5000, 'pce');

    PRINT 'Seed data inserted into [Commandes] and [LignesCommande].';
END
GO

