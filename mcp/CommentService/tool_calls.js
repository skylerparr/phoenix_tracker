import { createComment, getCommentsByIssue, getCommentsByUser, updateComment, deleteComment } from './comment_service.js';

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
    name: 'create_comment',
    description: 'Create a comment on an issue',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Comment content' },
        issue_id: { type: 'number', description: 'Issue ID' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['content', 'issue_id']
    }
  },
  {
    name: 'get_comments_by_issue',
    description: 'Get all comments for an issue',
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
    name: 'get_comments_by_user',
    description: 'Get all comments by a user',
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
    name: 'update_comment',
    description: 'Update a comment',
    inputSchema: {
      type: 'object',
      properties: {
        comment_id: { type: 'number' },
        content: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['comment_id', 'content']
    }
  },
  {
    name: 'delete_comment',
    description: 'Delete a comment',
    inputSchema: {
      type: 'object',
      properties: {
        comment_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['comment_id']
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'create_comment': {
        const token = await resolveToken(args, context);
        const res = await createComment(args.content, Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_comments_by_issue': {
        const token = await resolveToken(args, context);
        const res = await getCommentsByIssue(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_comments_by_user': {
        const token = await resolveToken(args, context);
        const res = await getCommentsByUser(Number(args.user_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'update_comment': {
        const token = await resolveToken(args, context);
        const res = await updateComment(Number(args.comment_id), args.content, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'delete_comment': {
        const token = await resolveToken(args, context);
        await deleteComment(Number(args.comment_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      default:
        throw new Error(`Unknown comment tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}