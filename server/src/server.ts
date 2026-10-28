import app from './app';
import { logError } from './utils/errors';
import { startMailboxPolling } from './services/mailbox-poller.service';
import { startAcademyScheduler } from './services/academyPropuestas';
import { dailyLabDigest } from './controllers/lab.controller';

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
    startMailboxPolling();
    startAcademyScheduler();
    startLabDigest();
});

// Resumen diario de pendientes de laboratorio: 7:00 a. m. hora de Colombia (UTC-5), dias habiles.
function startLabDigest() {
    let lastDay = '';
    setInterval(() => {
        const co = new Date(Date.now() - 5 * 3600 * 1000);
        const day = co.toISOString().slice(0, 10);
        const weekday = co.getUTCDay();
        if (co.getUTCHours() === 7 && weekday >= 1 && weekday <= 5 && day !== lastDay) {
            lastDay = day;
            dailyLabDigest().then(n => console.log(`[Laboratorio] Resumen diario enviado a ${n} usuario(s)`)).catch(e => logError('Resumen diario de laboratorio', e));
        }
    }, 5 * 60 * 1000);
}
