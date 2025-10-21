import { logout } from './auth_service.js';
import { parseArgs, prettyPrint, die } from '../cli.js';

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('AuthService/logout.js', {
    includeBaseUrl: true,
    includeOutput: true,
  });

  const userId = process.env.USER_ID ? parseInt(process.env.USER_ID, 10) : extractArgValue('--user-id');
  const token = process.env.TOKEN || extractArgValue('--token');

  if (!userId) {
    die('User ID is required. Set USER_ID env var or use --user-id flag.');
  }
  if (!token) {
    die('Token is required. Set TOKEN env var or use --token flag.');
  }

  logout(userId, { token, baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert })
    .then(() => prettyPrint({ message: 'Logout successful' }, config.output))
    .catch((e) => die(e.message || e));
}

function extractArgValue(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}
