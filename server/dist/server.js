"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const errors_1 = require("./utils/errors");
const PORT = Number(process.env.PORT) || 4000;
// Sin estos handlers, un fallo en una tarea de fondo (analisis de OIT, generacion
// de informes) desaparece sin dejar rastro.
process.on('unhandledRejection', (reason) => {
    (0, errors_1.logError)('Unhandled promise rejection', reason);
});
process.on('uncaughtException', (error) => {
    (0, errors_1.logError)('Uncaught exception, cerrando el proceso', error);
    process.exit(1);
});
app_1.default.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on port ${PORT}`);
});
