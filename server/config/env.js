import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setServers } from 'node:dns';
import dotenv from 'dotenv';

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(serverDirectory, '.env');
const legacyEnvFile = path.join(serverDirectory, 'server.env');

dotenv.config({ path: existsSync(envFile) ? envFile : legacyEnvFile });

const dnsServers = process.env.DNS_SERVERS?.split(',').map(server => server.trim()).filter(Boolean);
if (dnsServers?.length) setServers(dnsServers);
