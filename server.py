import os
import io
import json
from datetime import datetime, date
from flask import Flask, request, jsonify, render_template, send_from_directory, send_file
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from db import get_connection, get_config

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = 'sensus-tracabilie-secret-2026'
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

def serialize_row(cursor, row):
    if not row:
        return None
    columns = [col[0] for col in cursor.description]
    res = {}
    for col, val in zip(columns, row):
        if isinstance(val, (datetime, date)):
            res[col] = val.isoformat()
        elif hasattr(val, '__float__'):
            res[col] = float(val)
        else:
            res[col] = val
    return res

def serialize_rows(cursor, rows):
    columns = [col[0] for col in cursor.description]
    res = []
    for row in rows:
        item = {}
        for col, val in zip(columns, row):
            if isinstance(val, (datetime, date)):
                item[col] = val.isoformat()
            elif hasattr(val, '__float__'):
                item[col] = float(val)
            else:
                item[col] = val
        res.append(item)
    return res

# --------------------------------------------------------------------------
# Routes: Static / Pages
# --------------------------------------------------------------------------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/assets/<path:path>')
def send_assets(path):
    return send_from_directory('static/assets', path)

# --------------------------------------------------------------------------
# API: Authentication
# --------------------------------------------------------------------------
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json(silent=True, force=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, username, password_hash, full_name, role, email, is_active 
        FROM Users 
        WHERE username = ?
    """, username)
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        return jsonify({'success': False, 'error': 'Identifiant ou mot de passe incorrect'}), 401

    if not user[6]:
        conn.close()
        return jsonify({'success': False, 'error': 'Ce compte utilisateur a été désactivé'}), 403

    stored_hash = user[2]
    if stored_hash != password:
        conn.close()
        return jsonify({'success': False, 'error': 'Identifiant ou mot de passe incorrect'}), 401

    user_dict = {
        'id': user[0],
        'username': user[1],
        'full_name': user[3],
        'role': user[4],
        'email': user[5],
        'is_active': user[6]
    }
    
    cursor.execute("UPDATE Users SET last_login = GETDATE() WHERE id = ?", user_dict['id'])
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'user': user_dict,
        'token': f"token-{user_dict['username']}-{datetime.now().timestamp()}"
    })

# --------------------------------------------------------------------------
# API: Users Management (Admin)
# --------------------------------------------------------------------------
@app.route('/api/users', methods=['GET'])
def api_get_users():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, username, full_name, role, email, is_active, created_at, last_login
        FROM Users
        ORDER BY id ASC
    """)
    users = serialize_rows(cursor, cursor.fetchall())
    conn.close()
    return jsonify(users)

@app.route('/api/users', methods=['POST'])
def api_create_user():
    data = request.get_json(silent=True, force=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    full_name = data.get('full_name', '').strip()
    role = data.get('role', 'appro').strip()
    email = data.get('email', '').strip()
    is_active = 1 if data.get('is_active', True) else 0

    if not username or not password or not full_name:
        return jsonify({'error': 'Nom d’utilisateur, mot de passe et nom complet sont requis.'}), 400

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM Users WHERE username = ?", username)
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': f"Le nom d'utilisateur '{username}' existe déjà."}), 400

    cursor.execute("""
        INSERT INTO Users (username, password_hash, full_name, role, email, is_active, created_at)
        OUTPUT INSERTED.id
        VALUES (?, ?, ?, ?, ?, ?, GETDATE())
    """, username, password, full_name, role, email, is_active)
    new_id = int(cursor.fetchone()[0])
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'id': new_id, 'message': f'Utilisateur {username} créé avec succès.'})

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def api_update_user(user_id):
    data = request.get_json(silent=True, force=True) or {}
    full_name = data.get('full_name', '').strip()
    role = data.get('role', '').strip()
    email = data.get('email', '').strip()
    is_active = 1 if data.get('is_active', True) else 0
    password = data.get('password', '').strip()

    conn = get_connection()
    cursor = conn.cursor()

    if password:
        cursor.execute("""
            UPDATE Users SET full_name = ?, role = ?, email = ?, is_active = ?, password_hash = ?
            WHERE id = ?
        """, full_name, role, email, is_active, password, user_id)
    else:
        cursor.execute("""
            UPDATE Users SET full_name = ?, role = ?, email = ?, is_active = ?
            WHERE id = ?
        """, full_name, role, email, is_active, user_id)

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Utilisateur mis à jour avec succès.'})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def api_delete_user(user_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT role, username FROM Users WHERE id = ?", user_id)
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Utilisateur non trouvé'}), 404

    if row[0] == 'admin':
        cursor.execute("SELECT COUNT(*) FROM Users WHERE role = 'admin'")
        admin_count = cursor.fetchone()[0]
        if admin_count <= 1:
            conn.close()
            return jsonify({'error': 'Impossible de supprimer le dernier compte Administrateur.'}), 400

    cursor.execute("DELETE FROM Users WHERE id = ?", user_id)
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Utilisateur supprimé.'})

# --------------------------------------------------------------------------
# API: Stats & KPIs
# --------------------------------------------------------------------------
@app.route('/api/stats', methods=['GET'])
def api_stats():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM BonsReception")
    total_bons = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM BonsReception WHERE statut IN ('EN_ATTENTE_TECHNIQUE', 'EN_COURS_TECHNIQUE')")
    en_attente_tech = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM BonsReception WHERE statut = 'VALIDE_TECHNIQUE'")
    en_attente_mag = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM BonsReception WHERE statut = 'VALIDE_MAGASIN'")
    valide_mag = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM BonsReception WHERE statut = 'NON_CONFORME'")
    non_conforme = cursor.fetchone()[0]

    cursor.execute("SELECT AVG(CAST(duree_jours_technique AS FLOAT)) FROM BonsReception WHERE duree_jours_technique IS NOT NULL")
    avg_duree = cursor.fetchone()[0]
    avg_duree_val = round(avg_duree, 1) if avg_duree else 0.0

    cursor.execute("SELECT COUNT(*) FROM BonReceptionLignes")
    total_articles = cursor.fetchone()[0]

    conn.close()

    return jsonify({
        'total_bons': total_bons,
        'total_articles': total_articles,
        'en_attente_technique': en_attente_tech,
        'en_attente_magasin': en_attente_mag,
        'valide_magasin': valide_mag,
        'non_conforme': non_conforme,
        'duree_moyenne_jours': avg_duree_val
    })

# --------------------------------------------------------------------------
# API: Suppliers List (for filter dropdown)
# --------------------------------------------------------------------------
@app.route('/api/fournisseurs', methods=['GET'])
def api_fournisseurs():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT fournisseur FROM BonsReception WHERE fournisseur IS NOT NULL AND fournisseur != '' ORDER BY fournisseur ASC")
    rows = cursor.fetchall()
    conn.close()
    return jsonify([r[0] for r in rows])

# --------------------------------------------------------------------------
# API: Receptions List (Role-tailored information)
# --------------------------------------------------------------------------
@app.route('/api/receptions', methods=['GET'])
def api_receptions():
    search = request.args.get('search', '').strip()
    statut = request.args.get('statut', '').strip()
    fournisseur = request.args.get('fournisseur', '').strip()
    filter_tab = request.args.get('filter_tab', 'all').strip()
    user_role = request.args.get('user_role', 'all').strip()

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT b.id, b.numero_reception, b.fournisseur, b.date_reception, b.date_creation,
               b.statut, b.remarques_appro, 
               b.decision_technique, b.remarques_technique, b.date_validation_technique, b.duree_jours_technique,
               b.decision_magasin, b.remarques_magasin, b.date_validation_magasin, b.duree_jours_totale,
               u_app.full_name AS cree_par_nom,
               u_tech.full_name AS valideur_technique_nom,
               u_mag.full_name AS valideur_magasin_nom,
               (SELECT COUNT(*) FROM BonReceptionLignes l WHERE l.bon_reception_id = b.id) AS total_lignes,
               (SELECT SUM(l.quantite_attendue) FROM BonReceptionLignes l WHERE l.bon_reception_id = b.id) AS quantite_totale,
               (SELECT SUM(ISNULL(l.quantite_recue_magasin, 0)) FROM BonReceptionLignes l WHERE l.bon_reception_id = b.id) AS quantite_magasin_totale,
               (SELECT SUM(ISNULL(l.defauts_trouves, 0)) FROM BonReceptionLignes l WHERE l.bon_reception_id = b.id) AS total_defauts
        FROM BonsReception b
        LEFT JOIN Users u_app ON b.cree_par_id = u_app.id
        LEFT JOIN Users u_tech ON b.valideur_technique_id = u_tech.id
        LEFT JOIN Users u_mag ON b.valideur_magasin_id = u_mag.id
        WHERE 1=1
    """
    params = []

    if statut and statut != 'TOUS':
        query += " AND b.statut = ?"
        params.append(statut)

    if fournisseur and fournisseur != 'TOUS':
        query += " AND b.fournisseur = ?"
        params.append(fournisseur)

    # Filter tabs
    if filter_tab == 'pending_me':
        if user_role == 'technique':
            query += " AND b.statut IN ('EN_ATTENTE_TECHNIQUE', 'EN_COURS_TECHNIQUE')"
        elif user_role == 'magasin':
            query += " AND b.statut = 'VALIDE_TECHNIQUE'"
        elif user_role == 'appro':
            query += " AND b.statut IN ('EN_ATTENTE_TECHNIQUE', 'NON_CONFORME')"
    elif filter_tab == 'completed':
        query += " AND b.statut = 'VALIDE_MAGASIN'"
    elif filter_tab == 'issues':
        query += " AND b.statut IN ('NON_CONFORME', 'ECART_MAGASIN')"

    if search:
        search_pattern = f"%{search}%"
        query += """ AND (
            b.numero_reception LIKE ? OR 
            b.fournisseur LIKE ? OR 
            b.remarques_appro LIKE ? OR
            b.remarques_technique LIKE ? OR
            b.remarques_magasin LIKE ? OR
            EXISTS (SELECT 1 FROM BonReceptionLignes l WHERE l.bon_reception_id = b.id AND (
                l.code_article LIKE ? OR l.designation_article LIKE ? OR l.numero_commande LIKE ? OR l.numero_commande_sap LIKE ?
            ))
        )"""
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])

    query += " ORDER BY b.id DESC"

    cursor.execute(query, params)
    receptions = serialize_rows(cursor, cursor.fetchall())

    # Attach short items preview for each reception
    for r in receptions:
        cursor.execute("""
            SELECT TOP 3 code_article, designation_article, quantite_attendue, unite_mesure, statut_technique, quantite_recue_magasin
            FROM BonReceptionLignes
            WHERE bon_reception_id = ?
            ORDER BY ligne_numero ASC
        """, r['id'])
        r['sample_items'] = serialize_rows(cursor, cursor.fetchall())

    conn.close()
    return jsonify(receptions)

# --------------------------------------------------------------------------
# API: Single Reception Detail
# --------------------------------------------------------------------------
@app.route('/api/receptions/<int:bon_id>', methods=['GET'])
def api_reception_detail(bon_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT b.*, 
               u_app.full_name AS cree_par_nom,
               u_tech.full_name AS valideur_technique_nom,
               u_mag.full_name AS valideur_magasin_nom
        FROM BonsReception b
        LEFT JOIN Users u_app ON b.cree_par_id = u_app.id
        LEFT JOIN Users u_tech ON b.valideur_technique_id = u_tech.id
        LEFT JOIN Users u_mag ON b.valideur_magasin_id = u_mag.id
        WHERE b.id = ?
    """, bon_id)
    bon = serialize_row(cursor, cursor.fetchone())

    if not bon:
        conn.close()
        return jsonify({'error': 'Bon de réception non trouvé'}), 404

    cursor.execute("""
        SELECT l.*,
               u_tech.full_name AS controleur_technique_nom,
               u_mag.full_name AS controleur_magasin_nom
        FROM BonReceptionLignes l
        LEFT JOIN Users u_tech ON l.controleur_technique_id = u_tech.id
        LEFT JOIN Users u_mag ON l.controleur_magasin_id = u_mag.id
        WHERE l.bon_reception_id = ?
        ORDER BY l.ligne_numero ASC
    """, bon_id)
    lignes = serialize_rows(cursor, cursor.fetchall())

    cursor.execute("""
        SELECT h.*, u.full_name AS user_nom
        FROM HistoriqueTracabilite h
        LEFT JOIN Users u ON h.effectue_par_id = u.id
        WHERE h.bon_reception_id = ?
        ORDER BY h.timestamp DESC
    """, bon_id)
    historique = serialize_rows(cursor, cursor.fetchall())

    conn.close()

    bon['lignes'] = lignes
    bon['historique'] = historique
    return jsonify(bon)

# --------------------------------------------------------------------------
# API: Create Reception (Service Approvisionnement)
# Robust, auto-formatting, guaranteed to succeed
# --------------------------------------------------------------------------
@app.route('/api/receptions', methods=['POST'])
def api_create_reception():
    try:
        data = request.get_json(silent=True, force=True) or {}
        
        numero_reception = str(data.get('numero_reception') or '').strip()
        fournisseur = str(data.get('fournisseur') or '').strip()
        date_reception = str(data.get('date_reception') or '').strip()
        remarques_appro = str(data.get('remarques_appro') or '').strip()
        items = data.get('items', [])
        user_id = data.get('user_id', 1)
        user_nom = data.get('user_nom', 'Agent Approvisionnement')

        # If supplier is missing, default
        if not fournisseur:
            fournisseur = "Fournisseur Général"

        # If reception number is missing, auto-generate sequential
        conn = get_connection()
        cursor = conn.cursor()

        if not numero_reception:
            cursor.execute("SELECT ISNULL(MAX(id), 0) + 1 FROM BonsReception")
            next_num = cursor.fetchone()[0]
            numero_reception = f"REC-2026-{next_num:04d}"

        # If date is missing or invalid, default to today
        if not date_reception:
            date_reception = date.today().isoformat()

        # Check unique numero_reception, append suffix if exists
        cursor.execute("SELECT id FROM BonsReception WHERE numero_reception = ?", numero_reception)
        if cursor.fetchone():
            numero_reception = f"{numero_reception}-{datetime.now().strftime('%H%M%S')}"

        # Ensure at least 1 item
        if not items or len(items) == 0:
            items = [{
                "code_article": "ART-01",
                "designation_article": "Marchandise standard",
                "quantite_attendue": 1.0,
                "unite_mesure": "pce",
                "numero_commande": "",
                "numero_commande_sap": ""
            }]

        cursor.execute("""
            INSERT INTO BonsReception (
                numero_reception, fournisseur, date_reception, date_creation,
                statut, cree_par_id, remarques_appro
            ) 
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, GETDATE(), 'EN_ATTENTE_TECHNIQUE', ?, ?)
        """, numero_reception, fournisseur, date_reception, user_id, remarques_appro)
        bon_id = int(cursor.fetchone()[0])

        for idx, it in enumerate(items, start=1):
            code_article = str(it.get('code_article') or '').strip() or f"ART-{idx:02d}"
            designation = str(it.get('designation_article') or '').strip() or "Article réceptionné"
            
            try:
                quantite = float(it.get('quantite_attendue', 1.0))
            except (ValueError, TypeError):
                quantite = 1.0

            unite = str(it.get('unite_mesure') or 'pce').strip() or 'pce'
            num_cmd = str(it.get('numero_commande') or '').strip()
            num_sap = str(it.get('numero_commande_sap') or '').strip()

            cursor.execute("""
                INSERT INTO BonReceptionLignes (
                    bon_reception_id, ligne_numero, code_article, designation_article,
                    numero_commande, numero_commande_sap, quantite_attendue, unite_mesure,
                    statut_technique, statut_magasin
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'EN_ATTENTE', 'EN_ATTENTE')
            """, bon_id, idx, code_article, designation, num_cmd, num_sap, quantite, unite)

        # Historique
        cursor.execute("""
            INSERT INTO HistoriqueTracabilite (bon_reception_id, action, details, effectue_par_id, effectue_par_nom, role_utilisateur)
            VALUES (?, 'CREATION_RECEPTION', ?, ?, ?, 'appro')
        """, bon_id, f"Bon {numero_reception} créé avec {len(items)} article(s). En attente de Contrôle Technique.", user_id, user_nom)

        # Notification non lue pour le Contrôle Technique
        cursor.execute("""
            INSERT INTO Notifications (titre, message, role_destinataire, bon_reception_id, lu, date_creation)
            VALUES ('Nouveau Bon Réception', ?, 'technique', ?, 0, GETDATE())
        """, f"Nouveau bon N° {numero_reception} ({fournisseur}, {len(items)} articles) en attente de contrôle technique.", bon_id)

        conn.commit()
        conn.close()

        return jsonify({
            'success': True, 
            'bon_id': bon_id, 
            'numero_reception': numero_reception,
            'message': f'Bon de réception N° {numero_reception} créé avec succès et envoyé au Contrôle Technique.'
        })
    except Exception as e:
        print(f"Error in api_create_reception: {e}")
        return jsonify({'success': False, 'error': f"Erreur lors de la création : {str(e)}"}), 500

# --------------------------------------------------------------------------
# API: Update Reception (Edit by role)
# --------------------------------------------------------------------------
@app.route('/api/receptions/<int:bon_id>', methods=['PUT'])
def api_update_reception(bon_id):
    try:
        data = request.get_json(silent=True, force=True) or {}
        user_role = str(data.get('user_role') or data.get('role') or 'appro').lower()
        user_id = data.get('user_id', 1)
        user_nom = data.get('user_nom', 'Utilisateur')

        numero_reception = data.get('numero_reception')
        fournisseur = data.get('fournisseur')
        date_reception = data.get('date_reception')
        statut = data.get('statut')
        remarques_appro = data.get('remarques_appro')
        remarques_technique = data.get('remarques_technique')
        remarques_magasin = data.get('remarques_magasin')
        decision_technique = data.get('decision_technique')
        decision_magasin = data.get('decision_magasin')
        items = data.get('items') or data.get('lignes') or []

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM BonsReception WHERE id = ?", bon_id)
        current_bon = cursor.fetchone()
        if not current_bon:
            conn.close()
            return jsonify({'error': 'Bon de réception non trouvé'}), 404

        action_details = ''

        if user_role == 'technique':
            dec_tech = str(decision_technique).strip() if decision_technique is not None else current_bon[8]
            rem_tech = str(remarques_technique).strip() if remarques_technique is not None else current_bon[9]
            new_statut = 'NON_CONFORME' if dec_tech == 'NON_CONFORME' else ('VALIDE_TECHNIQUE' if dec_tech in ('CONFORME', 'AVEC_RESERVE') else current_bon[5])

            cursor.execute("""
                UPDATE BonsReception
                SET decision_technique = ?, remarques_technique = ?, statut = ?,
                    valideur_technique_id = ?, date_validation_technique = GETDATE(),
                    duree_jours_technique = DATEDIFF(day, date_creation, GETDATE())
                WHERE id = ?
            """, dec_tech, rem_tech, new_statut, user_id, bon_id)

            for it in items:
                l_num = it.get('ligne_numero', 1)
                st_tech = it.get('statut_technique', 'CONFORME')
                defauts = int(it.get('defauts_trouves', 0))
                rem_line = it.get('remarques_technique') or it.get('commentaire_technique') or ''
                cursor.execute("""
                    UPDATE BonReceptionLignes
                    SET statut_technique = ?, defauts_trouves = ?, remarques_technique = ?,
                        controleur_technique_id = ?, date_controle_technique = GETDATE()
                    WHERE bon_reception_id = ? AND ligne_numero = ?
                """, st_tech, defauts, rem_line, user_id, bon_id, l_num)

            action_details = f"Mise à jour Contrôle Technique par {user_nom} (Avis: {dec_tech})"

        elif user_role == 'magasin':
            dec_mag = str(decision_magasin).strip() if decision_magasin is not None else current_bon[12]
            rem_mag = str(remarques_magasin).strip() if remarques_magasin is not None else current_bon[13]
            new_statut = 'ECART_MAGASIN' if dec_mag == 'AVEC_ECART' else ('NON_CONFORME' if dec_mag == 'REFUSE' else ('VALIDE_MAGASIN' if dec_mag == 'CONFORME' else current_bon[5]))

            cursor.execute("""
                UPDATE BonsReception
                SET decision_magasin = ?, remarques_magasin = ?, statut = ?,
                    valideur_magasin_id = ?, date_validation_magasin = GETDATE(),
                    duree_jours_totale = DATEDIFF(day, date_creation, GETDATE())
                WHERE id = ?
            """, dec_mag, rem_mag, new_statut, user_id, bon_id)

            for it in items:
                l_num = it.get('ligne_numero', 1)
                q_rec = float(it.get('quantite_recue_magasin', 0)) if it.get('quantite_recue_magasin') is not None else None
                st_mag = it.get('statut_magasin', 'CONFORME')
                r_mag = it.get('remarques_magasin', '')
                cursor.execute("""
                    UPDATE BonReceptionLignes
                    SET quantite_recue_magasin = ?, statut_magasin = ?, remarques_magasin = ?,
                        controleur_magasin_id = ?, date_controle_magasin = GETDATE()
                    WHERE bon_reception_id = ? AND ligne_numero = ?
                """, q_rec, st_mag, r_mag, user_id, bon_id, l_num)

            action_details = f"Pointage et réception Magasin mis à jour par {user_nom} (Décision: {dec_mag})"

        elif user_role == 'appro':
            clean_num = str(numero_reception).strip() if numero_reception else current_bon[1]
            clean_four = str(fournisseur).strip() if fournisseur else current_bon[2]
            clean_date = str(date_reception).strip() if date_reception else str(current_bon[3])
            clean_rem_appro = str(remarques_appro).strip() if remarques_appro is not None else current_bon[7]

            cursor.execute("""
                UPDATE BonsReception
                SET numero_reception = ?, fournisseur = ?, date_reception = ?, remarques_appro = ?
                WHERE id = ?
            """, clean_num, clean_four, clean_date, clean_rem_appro, bon_id)

            if items:
                cursor.execute("SELECT * FROM BonReceptionLignes WHERE bon_reception_id = ? ORDER BY ligne_numero ASC", bon_id)
                old_lines = serialize_rows(cursor, cursor.fetchall())
                cursor.execute("DELETE FROM BonReceptionLignes WHERE bon_reception_id = ?", bon_id)

                for idx, it in enumerate(items, start=1):
                    code = str(it.get('code_article') or f"ART-{idx:02d}").strip()
                    desig = str(it.get('designation_article') or f"Article {idx}").strip()
                    cmd = str(it.get('numero_commande') or '').strip()
                    sap = str(it.get('numero_commande_sap') or '').strip()
                    qty_att = float(it.get('quantite_attendue', 0))
                    qty_mag = float(it.get('quantite_recue_magasin')) if it.get('quantite_recue_magasin') is not None else None
                    uom = str(it.get('unite_mesure') or 'pce').strip()
                    st_tech = it.get('statut_technique', 'EN_ATTENTE')
                    st_mag = it.get('statut_magasin', 'EN_ATTENTE')
                    defauts = int(it.get('defauts_trouves', 0))
                    rem_tech_line = it.get('remarques_technique') or it.get('commentaire_technique') or ''
                    rem_mag_line = it.get('remarques_magasin') or ''

                    cursor.execute("""
                        INSERT INTO BonReceptionLignes (
                            bon_reception_id, ligne_numero, code_article, designation_article,
                            numero_commande, numero_commande_sap, quantite_attendue, quantite_recue_magasin,
                            unite_mesure, statut_technique, statut_magasin, defauts_trouves,
                            remarques_technique, remarques_magasin
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, bon_id, idx, code, desig, cmd, sap, qty_att, qty_mag, uom, st_tech, st_mag, defauts, rem_tech_line, rem_mag_line)

            action_details = f"Informations d'en-tête et articles mis à jour par l'Approvisionnement ({user_nom})"

        else: # admin
            clean_num = str(numero_reception).strip() if numero_reception else current_bon[1]
            clean_four = str(fournisseur).strip() if fournisseur else current_bon[2]
            clean_date = str(date_reception).strip() if date_reception else str(current_bon[3])
            clean_statut = str(statut).strip() if statut else current_bon[5]

            cursor.execute("""
                UPDATE BonsReception
                SET numero_reception = ?, fournisseur = ?, date_reception = ?, statut = ?,
                    remarques_appro = COALESCE(?, remarques_appro),
                    remarques_technique = COALESCE(?, remarques_technique),
                    remarques_magasin = COALESCE(?, remarques_magasin),
                    decision_technique = COALESCE(?, decision_technique),
                    decision_magasin = COALESCE(?, decision_magasin)
                WHERE id = ?
            """, clean_num, clean_four, clean_date, clean_statut, remarques_appro, remarques_technique, remarques_magasin, decision_technique, decision_magasin, bon_id)

            if items:
                cursor.execute("DELETE FROM BonReceptionLignes WHERE bon_reception_id = ?", bon_id)
                for idx, it in enumerate(items, start=1):
                    code = str(it.get('code_article') or f"ART-{idx:02d}").strip()
                    desig = str(it.get('designation_article') or f"Article {idx}").strip()
                    cmd = str(it.get('numero_commande') or '').strip()
                    sap = str(it.get('numero_commande_sap') or '').strip()
                    qty_att = float(it.get('quantite_attendue', 0))
                    qty_mag = float(it.get('quantite_recue_magasin')) if it.get('quantite_recue_magasin') is not None else None
                    uom = str(it.get('unite_mesure') or 'pce').strip()
                    st_tech = it.get('statut_technique', 'EN_ATTENTE')
                    st_mag = it.get('statut_magasin', 'EN_ATTENTE')
                    defauts = int(it.get('defauts_trouves', 0))
                    rem_tech_line = it.get('remarques_technique') or it.get('commentaire_technique') or ''
                    rem_mag_line = it.get('remarques_magasin') or ''

                    cursor.execute("""
                        INSERT INTO BonReceptionLignes (
                            bon_reception_id, ligne_numero, code_article, designation_article,
                            numero_commande, numero_commande_sap, quantite_attendue, quantite_recue_magasin,
                            unite_mesure, statut_technique, statut_magasin, defauts_trouves,
                            remarques_technique, remarques_magasin
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, bon_id, idx, code, desig, cmd, sap, qty_att, qty_mag, uom, st_tech, st_mag, defauts, rem_tech_line, rem_mag_line)

            action_details = f"Modification administrateur complète effectuée par {user_nom}"

        cursor.execute("""
            INSERT INTO HistoriqueTracabilite (bon_reception_id, action, details, effectue_par_id, effectue_par_nom, role_utilisateur)
            VALUES (?, 'MODIFICATION_RECEPTION', ?, ?, ?, ?)
        """, bon_id, action_details, user_id, user_nom, user_role)

        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Bon de réception mis à jour avec succès.'})

    except Exception as e:
        print(f"Error in api_update_reception: {e}")
        return jsonify({'success': False, 'error': f"Erreur lors de la mise à jour : {str(e)}"}), 500

# --------------------------------------------------------------------------
# API: Submit Contrôle Technique
# --------------------------------------------------------------------------
@app.route('/api/receptions/<int:bon_id>/technique', methods=['POST'])
def api_submit_technique(bon_id):
    data = request.get_json(silent=True, force=True) or {}
    decision_globale = data.get('decision_globale', 'CONFORME')
    remarques_technique = data.get('remarques_technique', '').strip()
    user_id = data.get('user_id', 2)
    user_nom = data.get('user_nom', 'Contrôle Technique')
    lignes_feedback = data.get('lignes', [])

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT numero_reception, date_reception FROM BonsReception WHERE id = ?", bon_id)
    bon_row = cursor.fetchone()
    if not bon_row:
        conn.close()
        return jsonify({'error': 'Bon de réception non trouvé'}), 404

    num_bon = bon_row[0]
    date_reception = bon_row[1]
    today = date.today()
    duree_jours = (today - date_reception).days if hasattr(date_reception, 'day') else 0
    if duree_jours < 0:
        duree_jours = 0

    if decision_globale in ('CONFORME', 'AVEC_RESERVE'):
        nouveau_statut = 'VALIDE_TECHNIQUE'
    else:
        nouveau_statut = 'NON_CONFORME'

    cursor.execute("""
        UPDATE BonsReception SET
            statut = ?,
            date_validation_technique = GETDATE(),
            valideur_technique_id = ?,
            decision_technique = ?,
            remarques_technique = ?,
            duree_jours_technique = ?
        WHERE id = ?
    """, nouveau_statut, user_id, decision_globale, remarques_technique, duree_jours, bon_id)

    for lf in lignes_feedback:
        ligne_id = lf.get('id')
        statut_item = lf.get('statut_technique', decision_globale)
        remarques_item = lf.get('remarques_technique', '')
        defauts = int(lf.get('defauts_trouves', 0))

        cursor.execute("""
            UPDATE BonReceptionLignes SET
                statut_technique = ?,
                remarques_technique = ?,
                defauts_trouves = ?,
                date_controle_technique = GETDATE(),
                controleur_technique_id = ?
            WHERE id = ? AND bon_reception_id = ?
        """, statut_item, remarques_item, defauts, user_id, ligne_id, bon_id)

    # Historique
    cursor.execute("""
        INSERT INTO HistoriqueTracabilite (bon_reception_id, action, details, effectue_par_id, effectue_par_nom, role_utilisateur)
        VALUES (?, 'CONTROLE_TECHNIQUE', ?, ?, ?, 'technique')
    """, bon_id, f"Contrôle Technique: {decision_globale}. Remarques: {remarques_technique}. Durée: {duree_jours} jour(s).", user_id, user_nom)

    # Notifications
    if nouveau_statut == 'VALIDE_TECHNIQUE':
        cursor.execute("""
            INSERT INTO Notifications (titre, message, role_destinataire, bon_reception_id, lu, date_creation)
            VALUES ('Réception Validée Technique', ?, 'magasin', ?, 0, GETDATE())
        """, f"Le bon N° {num_bon} est validé par le Contrôle Technique. En attente de vérification quantité Magasin.", bon_id)
    else:
        cursor.execute("""
            INSERT INTO Notifications (titre, message, role_destinataire, bon_reception_id, lu, date_creation)
            VALUES ('Alerte Non-Conformité', ?, 'appro', ?, 0, GETDATE())
        """, f"Le bon N° {num_bon} a été refusé (NON CONFORME) par le Contrôle Technique.", bon_id)

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Contrôle technique enregistré avec succès.'})

# --------------------------------------------------------------------------
# API: Submit Contrôle Magasin
# --------------------------------------------------------------------------
@app.route('/api/receptions/<int:bon_id>/magasin', methods=['POST'])
def api_submit_magasin(bon_id):
    data = request.get_json(silent=True, force=True) or {}
    decision_magasin = data.get('decision_magasin', 'CONFORME')
    remarques_magasin = data.get('remarques_magasin', '').strip()
    user_id = data.get('user_id', 3)
    user_nom = data.get('user_nom', 'Gestionnaire Magasin')
    lignes_magasin = data.get('lignes', [])

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT numero_reception, date_reception FROM BonsReception WHERE id = ?", bon_id)
    bon_row = cursor.fetchone()
    if not bon_row:
        conn.close()
        return jsonify({'error': 'Bon de réception non trouvé'}), 404

    num_bon = bon_row[0]
    date_reception = bon_row[1]
    today = date.today()
    duree_totale = (today - date_reception).days if hasattr(date_reception, 'day') else 0
    if duree_totale < 0:
        duree_totale = 0

    if decision_magasin == 'CONFORME':
        nouveau_statut = 'VALIDE_MAGASIN'
    elif decision_magasin == 'AVEC_ECART':
        nouveau_statut = 'ECART_MAGASIN'
    else:
        nouveau_statut = 'NON_CONFORME'

    cursor.execute("""
        UPDATE BonsReception SET
            statut = ?,
            date_validation_magasin = GETDATE(),
            valideur_magasin_id = ?,
            decision_magasin = ?,
            remarques_magasin = ?,
            duree_jours_totale = ?
        WHERE id = ?
    """, nouveau_statut, user_id, decision_magasin, remarques_magasin, duree_totale, bon_id)

    for lm in lignes_magasin:
        ligne_id = lm.get('id')
        qty_recue = float(lm.get('quantite_recue_magasin', 0.0))
        statut_item = lm.get('statut_magasin', 'CONFORME')
        remarques_item = lm.get('remarques_magasin', '')

        cursor.execute("""
            UPDATE BonReceptionLignes SET
                quantite_recue_magasin = ?,
                statut_magasin = ?,
                remarques_magasin = ?,
                date_controle_magasin = GETDATE(),
                controleur_magasin_id = ?
            WHERE id = ? AND bon_reception_id = ?
        """, qty_recue, statut_item, remarques_item, user_id, ligne_id, bon_id)

    # Historique
    cursor.execute("""
        INSERT INTO HistoriqueTracabilite (bon_reception_id, action, details, effectue_par_id, effectue_par_nom, role_utilisateur)
        VALUES (?, 'VALIDATION_MAGASIN', ?, ?, ?, 'magasin')
    """, bon_id, f"Contrôle Magasin: {decision_magasin}. Remarques: {remarques_magasin}. Durée totale: {duree_totale} jour(s).", user_id, user_nom)

    # Notifications
    cursor.execute("""
        INSERT INTO Notifications (titre, message, role_destinataire, bon_reception_id, lu, date_creation)
        VALUES ('Réception Clôturée au Magasin', ?, 'appro', ?, 0, GETDATE())
    """, f"Le bon N° {num_bon} a été validé et entré en stock ({decision_magasin}).", bon_id)

    cursor.execute("""
        INSERT INTO Notifications (titre, message, role_destinataire, bon_reception_id, lu, date_creation)
        VALUES ('Réception Clôturée au Magasin', ?, 'technique', ?, 0, GETDATE())
    """, f"Le bon N° {num_bon} a été clôturé au magasin avec statut: {decision_magasin}.", bon_id)

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Contrôle Magasin enregistré et cycle clôturé avec succès.'})

# --------------------------------------------------------------------------
# API: Add Remark / Observation
# --------------------------------------------------------------------------
@app.route('/api/receptions/<int:bon_id>/remarques', methods=['POST'])
def api_add_remarque(bon_id):
    data = request.get_json(silent=True, force=True) or {}
    remarque = data.get('remarque', '').strip()
    user_nom = data.get('user_nom', 'Utilisateur')
    user_id = data.get('user_id', 1)
    role = data.get('role', 'appro')

    if not remarque:
        return jsonify({'error': 'Remarque vide'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO HistoriqueTracabilite (bon_reception_id, action, details, effectue_par_id, effectue_par_nom, role_utilisateur)
        VALUES (?, 'AJOUT_REMARQUE', ?, ?, ?, ?)
    """, bon_id, remarque, user_id, user_nom, role)

    conn.commit()
    conn.close()
    return jsonify({'success': True})

# --------------------------------------------------------------------------
# API: Notifications (Real Read / Unread System)
# --------------------------------------------------------------------------
@app.route('/api/notifications', methods=['GET'])
def api_notifications():
    role = request.args.get('role', 'all')
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT TOP 25 id, titre, message, role_destinataire, bon_reception_id, lu, date_creation
        FROM Notifications
        WHERE role_destinataire IN (?, 'all')
        ORDER BY lu ASC, id DESC
    """, role)
    notifs = serialize_rows(cursor, cursor.fetchall())

    cursor.execute("""
        SELECT COUNT(*) FROM Notifications
        WHERE role_destinataire IN (?, 'all') AND lu = 0
    """, role)
    unread_count = cursor.fetchone()[0]

    conn.close()
    return jsonify({'notifications': notifs, 'unread_count': unread_count})

@app.route('/api/notifications/<int:notif_id>/read', methods=['POST'])
def api_mark_notification_read(notif_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE Notifications SET lu = 1 WHERE id = ?", notif_id)
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/notifications/read-all', methods=['POST'])
def api_mark_all_notifications_read():
    data = request.get_json(silent=True, force=True) or {}
    role = data.get('role', 'all')
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE Notifications SET lu = 1 WHERE role_destinataire IN (?, 'all')", role)
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# --------------------------------------------------------------------------
# API: Export to Excel
# --------------------------------------------------------------------------
@app.route('/api/export', methods=['GET'])
def api_export_excel():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            ROW_NUMBER() OVER (ORDER BY b.id ASC, l.ligne_numero ASC) AS num_seq,
            b.date_creation,
            l.designation_article,
            l.code_article,
            l.numero_commande,
            b.fournisseur,
            l.quantite_attendue,
            l.unite_mesure,
            b.numero_reception,
            b.date_reception,
            b.duree_jours_technique,
            b.statut,
            b.remarques_technique,
            b.remarques_magasin
        FROM BonsReception b
        JOIN BonReceptionLignes l ON b.id = l.bon_reception_id
        ORDER BY b.id ASC, l.ligne_numero ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Réactivité Réceptions 2026"

    header_fill = PatternFill(start_color="003799", end_color="003799", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    title_font = Font(name="Calibri", size=14, bold=True, color="003799")

    ws.merge_cells("A1:D1")
    ws["A1"] = "Direction : Production | Département : Technique & Magasin"
    ws["A1"].font = Font(name="Calibri", size=11, bold=True, color="555555")

    ws.merge_cells("A3:J3")
    ws["A3"] = "Réactivité des bons réceptions 2026 - Système de Traçabilité Sensus"
    ws["A3"].font = title_font

    headers = [
        "N°", "Date", "Désignation article", "Code article", "N° commande", 
        "Fournisseur", "Quantité", "Unité", "Bon de reception", "Date de reception", 
        "Durée (j)", "Statut Traçabilité", "Observations Contrôle Technique", "Observations Magasin"
    ]

    ws.append([])
    ws.append(headers)
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=5, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for r in rows:
        row_data = [
            r[0],
            r[1].strftime("%d-%m-%y") if isinstance(r[1], (datetime, date)) else str(r[1]),
            r[2],
            r[3],
            r[4],
            r[5],
            float(r[6]) if r[6] else 0,
            r[7],
            r[8],
            r[9].strftime("%d-%m-%y") if isinstance(r[9], (datetime, date)) else str(r[9]),
            r[10] if r[10] is not None else "",
            r[11],
            r[12] or "",
            r[13] or ""
        ]
        ws.append(row_data)

    column_widths = {
        'A': 6, 'B': 12, 'C': 30, 'D': 15, 'E': 15, 'F': 18, 
        'G': 14, 'H': 8, 'I': 18, 'J': 15, 'K': 10, 'L': 20, 'M': 30, 'N': 30
    }
    for col_letter, width in column_widths.items():
        ws.column_dimensions[col_letter].width = width

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"SystemTracabilie_Export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return send_file(output, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", as_attachment=True, download_name=filename)

# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
if __name__ == '__main__':
    port = 150
    print(f"==================================================")
    print(f" Sensus - SystemTracabilie Web Platform")
    print(f" Running on http://localhost:{port}")
    print(f" Database: localhost\\SQLEXPRESS (SystemTracabilie)")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=port, debug=False)
