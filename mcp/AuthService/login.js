import { login } from './auth_service.js';
import { parseArgs, prettyPrint, die } from '../cli.js';

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('AuthService/login.js', {
    includeEmail: true,
    includeBaseUrl: true,
    includeOutput: true,
    requireEmail: true,
  });

  login(config.email, { baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert })
    .then((data) => prettyPrint(data, config.output))
    .catch((e) => die(e.message || e));
}
