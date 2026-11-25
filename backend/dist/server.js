"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = __importDefault(require("./routes/api"));
const db_1 = require("./config/db");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '150', 10);
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '15mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '15mb' }));
// No-cache headers
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    next();
});
// API Routes
app.use('/api', api_1.default);
// Serve Frontend (built assets or static assets)
const frontendDist = path_1.default.join(__dirname, '../../frontend/dist');
const legacyStatic = path_1.default.join(__dirname, '../../static');
app.use(express_1.default.static(frontendDist));
app.use('/static', express_1.default.static(legacyStatic));
app.use('/assets', express_1.default.static(path_1.default.join(legacyStatic, 'assets')));
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    const indexDist = path_1.default.join(frontendDist, 'index.html');
    res.sendFile(indexDist, (err) => {
        if (err) {
            // Fallback to legacy index if dist not yet built
            res.sendFile(path_1.default.join(__dirname, '../../templates/index.html'));
        }
    });
});
async function start() {
    try {
        console.log('==================================================');
        console.log(' Sensus - SystemTracabilie (TypeScript Backend)');
        console.log(` Target Port: ${PORT}`);
        console.log('==================================================');
        await (0, db_1.getPool)();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 SystemTracabilie Server running on http://localhost:${PORT}`);
            console.log(`🚀 Network access: http://127.0.0.1:${PORT}`);
        });
    }
    catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}
start();
