import os
import openpyxl
from datetime import datetime
from db import get_connection

EXCEL_PATH = r"C:\Users\msai\OneDrive - Sensus Germany GmbH & Co. KG\Documents\OS-Technique\Réactivité des Bons réceptions 2026.xlsx"

def import_data():
    if not os.path.exists(EXCEL_PATH):
        print(f"File not found: {EXCEL_PATH}")
        return

    print(f"Loading Excel workbook: {EXCEL_PATH}...")
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))

    conn = get_connection()
    cursor = conn.cursor()

    # Get appro user id
    cursor.execute("SELECT TOP 1 id FROM Users WHERE role = 'appro'")
    appro_user = cursor.fetchone()
    appro_id = appro_user[0] if appro_user else None

    # Group rows by Bon de reception
    # Row 5 (index 4) is header: N°, Date, Désignation article, Code article, N° commande, Fournisseur, Quantité, Unité, Bon de reception, Date de reception, Durée, Observations
    bons_dict = {}

    for row_idx, r in enumerate(rows[5:], start=6):
        bon_num = r[8]
        if not bon_num:
            continue
        bon_num = str(bon_num).strip()
        if not bon_num:
            continue

        if bon_num not in bons_dict:
            # Parse dates
            date_crea = r[1] if isinstance(r[1], (datetime, str)) else None
            date_rec = r[9] if isinstance(r[9], (datetime, str)) else None
            
            if isinstance(date_crea, datetime):
                date_crea_dt = date_crea
            elif isinstance(date_crea, str) and date_crea:
                try:
                    date_crea_dt = datetime.strptime(date_crea.strip(), "%d-%m-%y")
                except Exception:
                    date_crea_dt = datetime.now()
            else:
                date_crea_dt = datetime.now()

            if isinstance(date_rec, datetime):
                date_rec_d = date_rec.date()
            elif isinstance(date_rec, str) and date_rec:
                try:
                    date_rec_d = datetime.strptime(date_rec.strip(), "%d-%m-%y").date()
                except Exception:
                    date_rec_d = date_crea_dt.date()
            else:
                date_rec_d = date_crea_dt.date()

            fournisseur = str(r[5]).strip() if r[5] else "Inconnu"
            obs = str(r[11]).strip() if r[11] else ""

            duree = None
            if r[10] is not None:
                try:
                    duree = int(float(str(r[10]).strip()))
                except Exception:
                    duree = None

            bons_dict[bon_num] = {
                "numero_reception": bon_num,
                "fournisseur": fournisseur,
                "date_reception": date_rec_d,
                "date_creation": date_crea_dt,
                "remarques_appro": obs,
                "duree": duree,
                "items": []
            }

        # Items
        desig = str(r[2]).strip() if r[2] else "Article sans désignation"
        code_art = str(r[3]).strip() if r[3] else "CODE-0"
        num_cmd = str(r[4]).strip() if r[4] else ""
        num_cmd_sap = f"SAP-{num_cmd}" if num_cmd else ""
        
        qty = 1.0
        if r[6] is not None:
            try:
                # Handle space separators in French formatting e.g. "20 184"
                qty_str = str(r[6]).replace(" ", "").replace("\xa0", "").replace(",", ".")
                qty = float(qty_str)
            except Exception:
                qty = 1.0

        unite = str(r[7]).strip() if r[7] else "pce"

        bons_dict[bon_num]["items"].append({
            "code_article": code_art,
            "designation_article": desig,
            "numero_commande": num_cmd,
            "numero_commande_sap": num_cmd_sap,
            "quantite_attendue": qty,
            "unite_mesure": unite
        })

    print(f"Total Bons de Réception identified: {len(bons_dict)}")

    inserted_bons = 0
    inserted_items = 0

    for bon_num, data in bons_dict.items():
        cursor.execute("SELECT id FROM BonsReception WHERE numero_reception = ?", bon_num)
        existing = cursor.fetchone()
        
        # Decide status for variety in sample:
        # Most recent pending technique, some pending magasin, some completed
        statut = "EN_ATTENTE_TECHNIQUE"
        if data["duree"] is not None and data["duree"] > 0:
            statut = "VALIDE_MAGASIN"
        elif inserted_bons % 5 == 1:
            statut = "VALIDE_TECHNIQUE"
        elif inserted_bons % 7 == 2:
            statut = "EN_COURS_TECHNIQUE"

        if existing:
            bon_id = existing[0]
        else:
            cursor.execute("""
                INSERT INTO BonsReception (
                    numero_reception, fournisseur, date_reception, date_creation,
                    statut, cree_par_id, remarques_appro, duree_jours_technique
                ) 
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, data["numero_reception"], data["fournisseur"], data["date_reception"], 
                 data["date_creation"], statut, appro_id, data["remarques_appro"], data["duree"])
            bon_id = int(cursor.fetchone()[0])
            inserted_bons += 1

            # Log history
            cursor.execute("""
                INSERT INTO HistoriqueTracabilite (bon_reception_id, action, details, effectue_par_id, effectue_par_nom, role_utilisateur, timestamp)
                VALUES (?, 'CREATION_RECEPTION', ?, ?, 'Agent Approvisionnement', 'appro', ?)
            """, bon_id, f"Bon {bon_num} créé avec {len(data['items'])} article(s)", appro_id, data["date_creation"])

        # Insert items if not present
        cursor.execute("SELECT COUNT(*) FROM BonReceptionLignes WHERE bon_reception_id = ?", bon_id)
        if cursor.fetchone()[0] == 0:
            for idx, item in enumerate(data["items"], start=1):
                item_statut_tech = "CONFORME" if statut in ("VALIDE_TECHNIQUE", "VALIDE_MAGASIN") else "EN_ATTENTE"
                item_statut_mag = "CONFORME" if statut == "VALIDE_MAGASIN" else "EN_ATTENTE"
                qty_mag = item["quantite_attendue"] if statut == "VALIDE_MAGASIN" else None

                cursor.execute("""
                    INSERT INTO BonReceptionLignes (
                        bon_reception_id, ligne_numero, code_article, designation_article,
                        numero_commande, numero_commande_sap, quantite_attendue, unite_mesure,
                        statut_technique, statut_magasin, quantite_recue_magasin
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, bon_id, idx, item["code_article"], item["designation_article"],
                     item["numero_commande"], item["numero_commande_sap"], item["quantite_attendue"],
                     item["unite_mesure"], item_statut_tech, item_statut_mag, qty_mag)
                inserted_items += 1

    conn.commit()
    conn.close()
    print(f"Import complete! {inserted_bons} new Bons created, {inserted_items} items inserted.")

if __name__ == "__main__":
    import_data()
