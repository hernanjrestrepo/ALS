import app from './app';
import { logError } from './utils/errors';

const PORT = Number(process.env.PORT) || 4000;

// Sin estos handlers, un fallo en una tarea de fondo (analisis de OIT, generacion
// de informes) desaparece sin dejar rastro.
process.on('unhandledRejection', (reason) => {
    logError('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (error) => {
    logError('Uncaught exception, cerrando el proceso', error);
    process.exit(1);
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on port ${PORT}`);
});
