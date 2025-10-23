import { createIssue } from './issue_service.js';
import { parseArgs, prettyPrint, die } from '../cli.js';

function extractArgValue(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('IssueService/createIssue.js', {
    includeBaseUrl: true,
    includeOutput: true,
  });

  const title = process.env.TITLE || extractArgValue('--title');
  const priority = process.env.PRIORITY || extractArgValue('--priority');
  const status = process.env.STATUS || extractArgValue('--status');
  const isIcebox = process.env.IS_ICEBOX || extractArgValue('--is-icebox');
  const workType = process.env.WORK_TYPE || extractArgValue('--work-type');
  const token = process.env.TOKEN || extractArgValue('--token');
  const description = extractArgValue('--description');
  const points = extractArgValue('--points');
  const targetReleaseAt = extractArgValue('--target-release-at');

  if (!title) die('Title is required. Set TITLE env var or use --title flag.');
  if (priority === null || priority === undefined) die('Priority is required. Set PRIORITY env var or use --priority flag.');
  if (status === null || status === undefined) die('Status is required. Set STATUS env var or use --status flag.');
  if (isIcebox === null || isIcebox === undefined) die('isIcebox is required. Set IS_ICEBOX env var or use --is-icebox flag.');
  if (workType === null || workType === undefined) die('WorkType is required. Set WORK_TYPE env var or use --work-type flag.');
  if (!token) die('Token is required. Set TOKEN env var or use --token flag.');

  const options = { baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert };
  if (description) options.description = description;
  if (points) options.points = points;
  if (targetReleaseAt) options.targetReleaseAt = targetReleaseAt;

  createIssue(title, priority, status, isIcebox, workType, token, options)
    .then((data) => prettyPrint(data, config.output))
    .catch((e) => die(e.message || e));
}
