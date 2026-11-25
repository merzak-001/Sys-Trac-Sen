"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = void 0;
exports.getPool = getPool;
const mssql_1 = __importDefault(require("mssql"));
exports.sql = mssql_1.default;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let pool = null;
async function getPool() {
    if (pool && pool.connected) {
        return pool;
    }
    const preferredServer = process.env.DB_SERVER || '192.168.1.253';
    const dbName = process.env.DB_NAME || 'SystemTracabilie';
    const dbUser = process.env.DB_USER || 'sa';
    const dbPassword = process.env.DB_PASSWORD || '0000';
    const configs = [
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
            const newPool = new mssql_1.default.ConnectionPool(cfg);
            await newPool.connect();
            console.log(`[SQL Server] ✅ Connected successfully to ${cfg.server}!`);
            pool = newPool;
            return pool;
        }
        catch (err) {
            console.warn(`[SQL Server] ⚠️ Connection failed to ${cfg.server}: ${err?.message || err}`);
        }
    }
    throw new Error('Could not connect to any SQL Server instance. Please check network/credentials.');
}
