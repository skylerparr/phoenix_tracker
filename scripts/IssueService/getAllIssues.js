import { getAllIssues } from './issue_service.js';
import { parseArgs, prettyPrint, die } from '../cli.js';

function extractArgValue(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('IssueService/getAllIssues.js', {
    includeBaseUrl: true,
    includeOutput: true,
  });

  const token = process.env.TOKEN || extractArgValue('--token');

  if (!token) die('Token is required. Set TOKEN env var or use --token flag.');

  getAllIssues(token, { baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert })
    .then((data) => prettyPrint(data, config.output))
    .catch((e) => die(e.message || e));
}
