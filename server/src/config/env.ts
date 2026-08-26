import dotenv from 'dotenv';

dotenv.config();

const INSECURE_JWT_SECRETS = ['secret', 'supersecretkey', 'changeme', 'jwt_secret'];

export const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32 || INSECURE_JWT_SECRETS.includes(secret.toLowerCase())) {
        throw new Error(
            'JWT_SECRET must be set to a strong random value of at least 32 characters. ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
        );
    }

    return secret;
};

const DEFAULT_ALLOWED_ORIGINS = [
    'https://als.paradixe.xyz',
    'http://localhost:1612',
    'http://localhost:5173',
];

export const getAllowedOrigins = (): string[] => {
    const configured = [process.env.CORS_ORIGINS, process.env.FRONTEND_URL]
        .filter(Boolean)
        .join(',')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    return [...new Set([...configured, ...DEFAULT_ALLOWED_ORIGINS])];
};
