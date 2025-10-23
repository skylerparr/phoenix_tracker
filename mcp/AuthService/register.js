import { register } from './auth_service.js';
import { parseArgs, prettyPrint, die } from '../cli.js';

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('AuthService/register.js', {
    includeEmail: true,
    includeName: true,
    includeBaseUrl: true,
    includeOutput: true,
    requireEmail: true,
  });

  if (!process.env.NAME && !process.argv.includes('--name')) {
    die('Name is required. Set NAME env var or use --name flag.');
  }

  const name = process.env.NAME || extractArgValue('--name');

  register(name, config.email, { baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert })
    .then((data) => prettyPrint(data, config.output))
    .catch((e) => die(e.message || e));
}

function extractArgValue(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}
