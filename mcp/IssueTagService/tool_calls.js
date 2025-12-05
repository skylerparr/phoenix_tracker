import { createIssueTag, getIssueTagsByIssueId, getIssuesByTagId, deleteIssueTag } from './issue_tag_service.js';

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
    name: 'create_issue_tag',
    description: 'Add a tag to an issue',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'number' },
        tag_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['issue_id', 'tag_id']
    }
  },
  {
    name: 'get_issue_tags_by_issue_id',
    description: 'Get all tags for an issue',
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
    name: 'get_issues_by_tag_id',
    description: 'Get all issues with a specific tag',
    inputSchema: {
      type: 'object',
      properties: {
        tag_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['tag_id']
    }
  },
  {
    name: 'delete_issue_tag',
    description: 'Remove a tag from an issue',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'number' },
        tag_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['issue_id', 'tag_id']
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'create_issue_tag': {
        const token = await resolveToken(args, context);
        const res = await createIssueTag(Number(args.issue_id), Number(args.tag_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_issue_tags_by_issue_id': {
        const token = await resolveToken(args, context);
        const res = await getIssueTagsByIssueId(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_issues_by_tag_id': {
        const token = await resolveToken(args, context);
        const res = await getIssuesByTagId(Number(args.tag_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'delete_issue_tag': {
        const token = await resolveToken(args, context);
        await deleteIssueTag(Number(args.issue_id), Number(args.tag_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      default:
        throw new Error(`Unknown issue tag tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}