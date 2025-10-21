import { updateUser } from './user_service.js';
import { parseArgs, prettyPrint, die } from '../cli.js';

function extractArgValue(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('UserService/updateUser.js', {
    includeBaseUrl: true,
    includeOutput: true,
  });

  const userId = process.env.USER_ID ? parseInt(process.env.USER_ID, 10) : extractArgValue('--user-id');
  const token = process.env.TOKEN || extractArgValue('--token');
  const name = process.env.NAME || extractArgValue('--name');
  const email = process.env.EMAIL || extractArgValue('--email');

  if (!userId) {
    die('User ID is required. Set USER_ID env var or use --user-id flag.');
  }
  if (!token) {
    die('Token is required. Set TOKEN env var or use --token flag.');
  }

  const updates = {};
  if (name) updates.name = name;
  if (email) updates.email = email;

  if (Object.keys(updates).length === 0) {
    die('At least one update field (--name or --email) is required.');
  }

  updateUser(userId, updates, token, { baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert })
    .then((data) => prettyPrint(data, config.output))
    .catch((e) => die(e.message || e));
}
