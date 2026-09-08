"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const errors_1 = require("./utils/errors");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use('/api', routes_1.default);
app.get('/', (req, res) => {
    res.send('Paradixe ALS V2 API');
});
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});
app.use('/api', (req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});
// Ultimo recurso: cualquier error que escape de un handler se registra y se responde
// como JSON, en vez de la pagina HTML por defecto de Express o de una peticion colgada.
app.use((err, req, res, next) => {
    (0, errors_1.logError)(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
    if (res.headersSent)
        return next(err);
    const status = typeof (err === null || err === void 0 ? void 0 : err.status) === 'number' ? err.status : 500;
    const message = status < 500 && (err === null || err === void 0 ? void 0 : err.message) ? err.message : 'Error interno del servidor';
    res.status(status).json({ error: message });
});
exports.default = app;
