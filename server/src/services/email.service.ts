import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

// Usa las credenciales del rol IAM de la instancia EC2 automáticamente
// (sin API keys en .env — AWS SDK toma el rol vía el servicio de metadata).
const sesClient = new SESv2Client({ region: process.env.AWS_REGION || 'us-east-1' });

const SENDER = process.env.SES_SENDER_EMAIL || 'ceo@paradixe.xyz';

const PARADIXE_FOOTER = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #e2e5ea;">
        <tr>
            <td style="padding-top:20px;text-align:center;">
                <a href="https://www.paradixe.xyz/" target="_blank" style="text-decoration:none;">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:14px;letter-spacing:1px;color:#12224B;">PARADIXE</span>
                </a>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8a93a6;margin-top:4px;">
                    <a href="https://www.paradixe.xyz/" target="_blank" style="color:#3E6BFF;text-decoration:none;">www.paradixe.xyz</a>
                </div>
            </td>
        </tr>
    </table>`;

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<void> {
    const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#12224B;font-size:18px;">Recuperación de contraseña</h2>
        <p style="color:#333;font-size:14px;line-height:1.5;">
            Solicitaste restablecer tu contraseña en el Sistema de Gestión OIT de ALS.
            Este link es válido por 1 hora y solo se puede usar una vez.
        </p>
        <p style="margin:24px 0;">
            <a href="${resetUrl}" style="background:#3E6BFF;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;display:inline-block;">
                Definir nueva contraseña
            </a>
        </p>
        <p style="color:#8a93a6;font-size:12px;">
            Si no solicitaste este cambio, puedes ignorar este correo.
        </p>
        ${PARADIXE_FOOTER}
    </div>`;

    const command = new SendEmailCommand({
        FromEmailAddress: SENDER,
        Destination: { ToAddresses: [toEmail] },
        Content: {
            Simple: {
                Subject: { Data: 'Recuperación de contraseña — ALS' },
                Body: { Html: { Data: html } },
            },
        },
    });

    await sesClient.send(command);
}
