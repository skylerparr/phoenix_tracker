import { createBlocker, getBlockerIssues, getBlockedIssues, deleteBlocker } from './blocker_service.js';

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
    name: 'create_blocker',
    description: 'Create a blocker relationship between two issues',
    inputSchema: {
      type: 'object',
      properties: {
        blocker_id: { type: 'number', description: 'Blocking issue ID' },
        blocked_id: { type: 'number', description: 'Blocked issue ID' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['blocker_id', 'blocked_id']
    }
  },
  {
    name: 'get_blocker_issues',
    description: 'Get issues that a given issue blocks',
    inputSchema: {
      type: 'object',
      properties: {
        blocker_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['blocker_id']
    }
  },
  {
    name: 'get_blocked_issues',
    description: 'Get issues that block a given issue',
    inputSchema: {
      type: 'object',
      properties: {
        blocked_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['blocked_id']
    }
  },
  {
    name: 'delete_blocker',
    description: 'Delete a blocker relationship',
    inputSchema: {
      type: 'object',
      properties: {
        blocker_id: { type: 'number' },
        blocked_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['blocker_id', 'blocked_id']
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'create_blocker': {
        const token = await resolveToken(args, context);
        const res = await createBlocker(Number(args.blocker_id), Number(args.blocked_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_blocker_issues': {
        const token = await resolveToken(args, context);
        const res = await getBlockerIssues(Number(args.blocker_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_blocked_issues': {
        const token = await resolveToken(args, context);
        const res = await getBlockedIssues(Number(args.blocked_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'delete_blocker': {
        const token = await resolveToken(args, context);
        await deleteBlocker(Number(args.blocker_id), Number(args.blocked_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      default:
        throw new Error(`Unknown blocker tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}
