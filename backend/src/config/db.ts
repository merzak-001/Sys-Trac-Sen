import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  const preferredServer = process.env.DB_SERVER || '192.168.1.253';
  const dbName = process.env.DB_NAME || 'SystemTracabilie';
  const dbUser = process.env.DB_USER || 'sa';
  const dbPassword = process.env.DB_PASSWORD || '0000';

  const configs: sql.config[] = [
    // 1. Remote Server 192.168.1.253 via direct TDS
    {
      server: preferredServer,
      port: 1433,
      database: dbName,
      user: dbUser,
      password: dbPassword,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      },
      connectionTimeout: 6000,
      requestTimeout: 20000
    },
    // 2. Fallback to 192.168.1.253 without explicit port
    {
      server: '192.168.1.253',
      database: dbName,
      user: dbUser,
      password: dbPassword,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 6000,
      requestTimeout: 20000
    },
    // 3. Fallback to Localhost SQLEXPRESS
    {
      server: '127.0.0.1',
      port: 1433,
      database: dbName,
      user: 'sa',
      password: dbPassword,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 20000
    }
  ];

  for (const cfg of configs) {
    try {
      console.log(`[SQL Server] Connecting to ${cfg.server} (Database: ${cfg.database})...`);
      const newPool = new sql.ConnectionPool(cfg);
      await newPool.connect();
      console.log(`[SQL Server] ✅ Connected successfully to ${cfg.server}!`);
      pool = newPool;
      return pool;
    } catch (err: any) {
      console.warn(`[SQL Server] ⚠️ Connection failed to ${cfg.server}: ${err?.message || err}`);
    }
  }

  throw new Error('Could not connect to any SQL Server instance. Please check network/credentials.');
}

export { sql };
