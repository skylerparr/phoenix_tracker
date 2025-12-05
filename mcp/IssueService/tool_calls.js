import {
  createIssue,
  getIssue,
  updateIssue,
  deleteIssue,
  startIssue,
  finishIssue,
  deliverIssue,
  acceptIssue,
  rejectIssue,
  getAllIssues,
  getMyIssues,
  getIssuesByTag,
  getIssuesByUser,
  getAllAccepted,
  getAllIcebox,
  getWeeklyPointsAverage,
} from './issue_service.js';

/**
 * Type hints (for editors)
 * @typedef {import('../../frontend/src/models/Issue.tsx').Issue} Issue
 */

const POINTS = [0, 1, 2, 3, 5, 8];
const WORK_TYPE_MAP = { feature: 0, bug: 1, chore: 2, release: 3 };

function buildOptions(args = {}) {
  const opts = {};
  if (args.base_url) opts.baseUrl = args.base_url;
  if (typeof args.insecure === 'boolean') opts.insecure = args.insecure;
  if (args.cacert) opts.cacert = args.cacert;
  if (args.token) opts.token = args.token;
  return opts;
}

async function resolveToken(args = {}, context = {}) {
  if (typeof context.getToken === 'function') return context.getToken();
  if (context.token) return context.token;
  if (args.token) return args.token;
  throw new Error('Token is required');
}

function toWorkTypeInt(workTypeStr) {
  if (!workTypeStr) return WORK_TYPE_MAP.feature;
  const key = String(workTypeStr).toLowerCase();
  if (!(key in WORK_TYPE_MAP)) throw new Error(`Invalid work_type: ${workTypeStr}`);
  return WORK_TYPE_MAP[key];
}

function mapUpdateArgs(args = {}) {
  const updates = {};
  if (args.title !== undefined) updates.title = args.title;
  if (args.description !== undefined) updates.description = args.description;
  if (args.priority !== undefined) updates.priority = args.priority;
  if (args.points !== undefined) updates.points = args.points;
  if (args.status !== undefined) updates.status = args.status;
  if (args.is_icebox !== undefined) updates.isIcebox = args.is_icebox;
  if (args.work_type !== undefined) updates.workType = toWorkTypeInt(args.work_type);
  if (args.target_release_at !== undefined) updates.targetReleaseAt = args.target_release_at;
  return updates;
}

export const tools = [
  {
    name: 'list_issues',
    description: 'List all issues in the backlog',
    inputSchema: {
      type: 'object',
      properties: {
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      }
    }
  },
  {
    name: 'create_issue',
    description: 'Create a new issue for the backlog',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Issue title' },
        points: { type: 'number', description: 'Story points', enum: POINTS },
        description: { type: 'string', description: 'Detailed description' },
        work_type: { type: 'string', description: 'feature | bug | chore | release', enum: Object.keys(WORK_TYPE_MAP) },
        target_release_at: { type: 'string', description: 'ISO date string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['title']
    }
  },
  {
    name: 'get_issue',
    description: 'Get a single issue by ID',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['issue_id']
    }
  },
  {
    name: 'update_issue',
    description: 'Update fields on an issue',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'number' },
        points: { type: 'number', enum: POINTS },
        status: { type: 'number' },
        is_icebox: { type: 'boolean' },
        work_type: { type: 'string', enum: Object.keys(WORK_TYPE_MAP) },
        target_release_at: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['issue_id']
    }
  },
  {
    name: 'delete_issue',
    description: 'Delete an issue by ID',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['issue_id']
    }
  },
  { name: 'start_issue', description: 'Start an issue', inputSchema: { type: 'object', properties: { issue_id: { type: 'number' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['issue_id'] } },
  { name: 'finish_issue', description: 'Finish an issue', inputSchema: { type: 'object', properties: { issue_id: { type: 'number' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['issue_id'] } },
  { name: 'deliver_issue', description: 'Deliver an issue', inputSchema: { type: 'object', properties: { issue_id: { type: 'number' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['issue_id'] } },
  { name: 'accept_issue', description: 'Accept an issue', inputSchema: { type: 'object', properties: { issue_id: { type: 'number' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['issue_id'] } },
  { name: 'reject_issue', description: 'Reject an issue', inputSchema: { type: 'object', properties: { issue_id: { type: 'number' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['issue_id'] } },
  { name: 'get_my_issues', description: 'List issues assigned to the current user', inputSchema: { type: 'object', properties: { base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } } } },
  { name: 'get_issues_by_tag', description: 'List issues by tag', inputSchema: { type: 'object', properties: { tag_id: { type: 'number' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['tag_id'] } },
  { name: 'get_issues_by_user', description: 'List issues by user', inputSchema: { type: 'object', properties: { user_id: { type: 'number' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['user_id'] } },
  { name: 'get_all_accepted', description: 'List accepted issues', inputSchema: { type: 'object', properties: { base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } } } },
  { name: 'get_all_icebox', description: 'List icebox issues', inputSchema: { type: 'object', properties: { base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } } } },
  { name: 'get_weekly_points_average', description: 'Get weekly points average', inputSchema: { type: 'object', properties: { base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } } } }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'list_issues': {
        const token = await resolveToken(args, context);
        const issues = await getAllIssues(token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }] };
      }
      case 'create_issue': {
        const token = await resolveToken(args, context);
        const payload = {
          title: args.title,
          workType: args.work_type ? toWorkTypeInt(args.work_type) : WORK_TYPE_MAP.feature,
          description: args.description ?? '',
          points: args.points,
          targetReleaseAt: args.target_release_at,
        };
        const issue = await createIssue(payload.title, token, payload);
        return { content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }] };
      }
      case 'get_issue': {
        const token = await resolveToken(args, context);
        const res = await getIssue(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'update_issue': {
        const token = await resolveToken(args, context);
        const updates = mapUpdateArgs(args);
        const res = await updateIssue(Number(args.issue_id), updates, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'delete_issue': {
        const token = await resolveToken(args, context);
        await deleteIssue(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      case 'start_issue': {
        const token = await resolveToken(args, context);
        const res = await startIssue(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'finish_issue': {
        const token = await resolveToken(args, context);
        const res = await finishIssue(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'deliver_issue': {
        const token = await resolveToken(args, context);
        const res = await deliverIssue(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'accept_issue': {
        const token = await resolveToken(args, context);
        const res = await acceptIssue(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'reject_issue': {
        const token = await resolveToken(args, context);
        const res = await rejectIssue(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_my_issues': {
        const token = await resolveToken(args, context);
        const res = await getMyIssues(token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_issues_by_tag': {
        const token = await resolveToken(args, context);
        const res = await getIssuesByTag(Number(args.tag_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_issues_by_user': {
        const token = await resolveToken(args, context);
        const res = await getIssuesByUser(Number(args.user_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_all_accepted': {
        const token = await resolveToken(args, context);
        const res = await getAllAccepted(token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_all_icebox': {
        const token = await resolveToken(args, context);
        const res = await getAllIcebox(token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_weekly_points_average': {
        const token = await resolveToken(args, context);
        const res = await getWeeklyPointsAverage(token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      default:
        throw new Error(`Unknown issue tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}
