USE [SystemTracabilie];
GO

-- Seed initial test sample if empty
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

