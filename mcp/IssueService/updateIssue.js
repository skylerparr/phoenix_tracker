import { updateIssue } from './issue_service.js';
import { parseArgs, prettyPrint, die } from '../cli.js';

function extractArgValue(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('IssueService/updateIssue.js', {
    includeBaseUrl: true,
    includeOutput: true,
  });

  const issueId = process.env.ISSUE_ID ? parseInt(process.env.ISSUE_ID, 10) : extractArgValue('--issue-id');
  const token = process.env.TOKEN || extractArgValue('--token');
  const title = extractArgValue('--title');
  const description = extractArgValue('--description');
  const priority = extractArgValue('--priority');
  const points = extractArgValue('--points');
  const status = extractArgValue('--status');
  const isIcebox = extractArgValue('--is-icebox');
  const workType = extractArgValue('--work-type');
  const targetReleaseAt = extractArgValue('--target-release-at');

  if (!issueId) die('Issue ID is required. Set ISSUE_ID env var or use --issue-id flag.');
  if (!token) die('Token is required. Set TOKEN env var or use --token flag.');

  const updates = {};
  if (title) updates.title = title;
  if (description) updates.description = description;
  if (priority) updates.priority = parseInt(priority, 10);
  if (points) updates.points = parseInt(points, 10);
  if (status) updates.status = parseInt(status, 10);
  if (isIcebox !== null && isIcebox !== undefined) updates.isIcebox = isIcebox === 'true' || isIcebox === true;
  if (workType) updates.workType = parseInt(workType, 10);
  if (targetReleaseAt) updates.targetReleaseAt = targetReleaseAt;

  if (Object.keys(updates).length === 0) die('At least one update field is required.');

  updateIssue(issueId, updates, token, { baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert })
    .then((data) => prettyPrint(data, config.output))
    .catch((e) => die(e.message || e));
}
