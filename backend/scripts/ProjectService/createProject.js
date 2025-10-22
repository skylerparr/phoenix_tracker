import { createProject } from './project_service.js';
import { parseArgs, prettyPrint, die } from '../cli.js';

function extractArgValue(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('ProjectService/createProject.js', {
    includeBaseUrl: true,
    includeOutput: true,
  });

  const name = process.env.NAME || extractArgValue('--name');
  const token = process.env.TOKEN || extractArgValue('--token');

  if (!name) die('Project name is required. Set NAME env var or use --name flag.');
  if (!token) die('Token is required. Set TOKEN env var or use --token flag.');

  createProject(name, token, { baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert })
    .then((data) => prettyPrint(data, config.output))
    .catch((e) => die(e.message || e));
}
