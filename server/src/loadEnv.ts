import fs from 'fs';
import path from 'path';

/** Loads the repo-root `.env` (or ENV_FILE) into process.env; variables already set in the shell win. */
const envFile = process.env.ENV_FILE ?? path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
