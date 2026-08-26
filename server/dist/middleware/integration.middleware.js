"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationAuthMiddleware = void 0;
const crypto_1 = __importDefault(require("crypto"));
const auth_middleware_1 = require("./auth.middleware");
const timingSafeEquals = (a, b) => {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && crypto_1.default.timingSafeEqual(bufA, bufB);
};
/**
 * Guards the legacy external-integration endpoints. Accepts either a normal
 * user JWT (Authorization header) or the shared integration key sent in
 * `x-api-key` (INTEGRATION_API_KEY). Requests with neither are rejected.
 */
const integrationAuthMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.headers.authorization) {
        return (0, auth_middleware_1.authMiddleware)(req, res, next);
    }
    const configuredKey = process.env.INTEGRATION_API_KEY;
    const providedKey = req.header('x-api-key');
    if (configuredKey && providedKey && timingSafeEquals(configuredKey, providedKey)) {
        return next();
    }
    return res.status(401).json({ error: 'No autorizado' });
});
exports.integrationAuthMiddleware = integrationAuthMiddleware;
