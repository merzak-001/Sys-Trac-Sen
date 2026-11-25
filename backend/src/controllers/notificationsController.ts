import { Request, Response } from 'express';
import { getPool, sql } from '../config/db';

export async function getNotifications(req: Request, res: Response) {
  try {
    const role = String(req.query.role || 'all').trim();
    const pool = await getPool();

    let query = `
      SELECT TOP 25 id, titre, message, role_destinataire, bon_reception_id, lu, date_creation
      FROM Notifications
      WHERE 1=1
    `;
    const request = pool.request();

    if (role && role !== 'admin' && role !== 'all') {
      request.input('role', sql.NVarChar, role);
      query += ` AND (role_destinataire = @role OR role_destinataire = 'all')`;
    }

    query += ` ORDER BY date_creation DESC`;

    const result = await request.query(query);
    const notifications = result.recordset;
    const unread_count = notifications.filter((n: any) => !n.lu).length;

    return res.json({
      notifications,
      unread_count
    });
  } catch (err: any) {
    console.error('Error in getNotifications:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const notif_id = parseInt(req.params.id, 10);
    const pool = await getPool();

    await pool.request()
      .input('notif_id', sql.Int, notif_id)
      .query(`UPDATE Notifications SET lu = 1 WHERE id = @notif_id`);

    return res.json({ success: true, message: 'Notification marquée comme lue' });
  } catch (err: any) {
    console.error('Error in markNotificationRead:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  try {
    const { role } = req.body || {};
    const pool = await getPool();
    const request = pool.request();

    let query = `UPDATE Notifications SET lu = 1 WHERE lu = 0`;
    if (role && role !== 'admin') {
      request.input('role', sql.NVarChar, String(role));
      query += ` AND (role_destinataire = @role OR role_destinataire = 'all')`;
    }

    await request.query(query);
    return res.json({ success: true, message: 'Toutes les notifications sont marquées comme lues' });
  } catch (err: any) {
    console.error('Error in markAllNotificationsRead:', err);
    return res.status(500).json({ error: err.message });
  }
}

