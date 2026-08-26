import app from './app';
import { getJwtSecret } from './config/env';

// Fail fast on a missing or weak JWT_SECRET instead of accepting tokens
// signed with a guessable key.
getJwtSecret();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
