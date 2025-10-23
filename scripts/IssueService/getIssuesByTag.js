import { getIssuesByTag } from './issue_service.js';
import { parseArgs, prettyPrint, die } from '../cli.js';

function extractArgValue(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('IssueService/getIssuesByTag.js', {
    includeBaseUrl: true,
    includeOutput: true,
  });

  const tagId = process.env.TAG_ID ? parseInt(process.env.TAG_ID, 10) : extractArgValue('--tag-id');
  const token = process.env.TOKEN || extractArgValue('--token');

  if (!tagId) die('Tag ID is required. Set TAG_ID env var or use --tag-id flag.');
  if (!token) die('Token is required. Set TOKEN env var or use --token flag.');

  getIssuesByTag(tagId, token, { baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert })
    .then((data) => prettyPrint(data, config.output))
    .catch((e) => die(e.message || e));
}
