import { createIssueAssignee, getIssueAssigneesByIssueId, getUserAssigneesByUserId, deleteIssueAssignee } from './issue_assignee_service.js';

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

export const tools = [
  {
    name: 'create_issue_assignee',
    description: 'Assign a user to an issue',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'number' },
        user_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['issue_id', 'user_id']
    }
  },
  {
    name: 'get_issue_assignees_by_issue_id',
    description: 'Get all assignees for an issue',
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
    name: 'get_user_assignees_by_user_id',
    description: 'Get all issues assigned to a user',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['user_id']
    }
  },
  {
    name: 'delete_issue_assignee',
    description: 'Unassign a user from an issue',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'number' },
        user_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['issue_id', 'user_id']
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'create_issue_assignee': {
        const token = await resolveToken(args, context);
        const res = await createIssueAssignee(Number(args.issue_id), Number(args.user_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_issue_assignees_by_issue_id': {
        const token = await resolveToken(args, context);
        const res = await getIssueAssigneesByIssueId(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_user_assignees_by_user_id': {
        const token = await resolveToken(args, context);
        const res = await getUserAssigneesByUserId(Number(args.user_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'delete_issue_assignee': {
        const token = await resolveToken(args, context);
        await deleteIssueAssignee(Number(args.issue_id), Number(args.user_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      default:
        throw new Error(`Unknown issue assignee tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}