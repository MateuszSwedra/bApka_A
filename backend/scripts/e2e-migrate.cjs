/**
 * Uruchamia prisma migrate deploy przeciwko bazie e2e (port 5434).
 */
const { execSync } = require('child_process');
const path = require('path');

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://bapka_e2e:bapka_e2e@127.0.0.1:5434/bapka_e2e?schema=public';

execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: process.env,
});
