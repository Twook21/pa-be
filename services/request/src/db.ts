import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

// Import type (erased at runtime)
// @ts-ignore
import type { PrismaClient as ClientType } from '../../../node_modules/.prisma/request-client/index.d.ts';

const _require = createRequire(import.meta.url);
const _clientPath = path.resolve(fileURLToPath(import.meta.url), '../../..', 'node_modules/.prisma/request-client/index.js');
const { PrismaClient: RuntimeClient } = _require(_clientPath);

export const PrismaClient = RuntimeClient as typeof ClientType;