import { execSync } from 'node:child_process';

async function globalSetup(): Promise<void> {
  execSync('npm run testdb:reset:staging', {
    stdio: 'inherit',
    env: process.env,
  });
}

export default globalSetup;
