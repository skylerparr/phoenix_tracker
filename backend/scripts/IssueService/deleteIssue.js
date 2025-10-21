import { deleteIssue } from './issue_service.js';
import { parseArgs, prettyPrint, die } from '../cli.js';

function extractArgValue(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('IssueService/deleteIssue.js', {
    includeBaseUrl: true,
    includeOutput: true,
  });

  const issueId = process.env.ISSUE_ID ? parseInt(process.env.ISSUE_ID, 10) : extractArgValue('--issue-id');
  const token = process.env.TOKEN || extractArgValue('--token');

  if (!issueId) die('Issue ID is required. Set ISSUE_ID env var or use --issue-id flag.');
  if (!token) die('Token is required. Set TOKEN env var or use --token flag.');

  deleteIssue(issueId, token, { baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert })
    .then(() => prettyPrint({ message: 'Issue deleted successfully' }, config.output))
    .catch((e) => die(e.message || e));
}
