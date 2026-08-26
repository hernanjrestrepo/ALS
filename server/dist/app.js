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
const env_1 = require("./config/env");
dotenv_1.default.config();
const app = (0, express_1.default)();
const allowedOrigins = (0, env_1.getAllowedOrigins)();
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Requests without an Origin header (curl, server-to-server, same-origin
        // navigations) are not subject to the browser same-origin policy.
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // Do not echo back unknown origins: the response simply carries no
        // CORS headers and the browser blocks the cross-origin read.
        console.warn(`[CORS] Blocked origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '2mb' }));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use('/api', routes_1.default);
app.get('/', (req, res) => {
    res.send('Paradixe ALS V2 API');
});
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});
exports.default = app;
