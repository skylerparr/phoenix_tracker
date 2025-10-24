import { createUser, getAllUsers, getUser, getUserByEmail, updateUser, deleteUser, inviteUser, removeUser } from './user_service.js';

/**
 * Type hints (for editors)
 * @typedef {import('../../frontend/src/models/User.tsx').User} User
 */

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
    name: 'create_user',
    description: 'Create a new user',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['name', 'email']
    }
  },
  {
    name: 'get_all_users',
    description: 'Get all users in the current project',
    inputSchema: { type: 'object', properties: { token: { type: 'string' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } } }
  },
  {
    name: 'get_user',
    description: 'Get user by ID',
    inputSchema: { type: 'object', properties: { user_id: { type: 'number' }, token: { type: 'string' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['user_id'] }
  },
  {
    name: 'get_user_by_email',
    description: 'Get user by email',
    inputSchema: { type: 'object', properties: { email: { type: 'string', format: 'email' }, token: { type: 'string' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['email'] }
  },
  {
    name: 'update_user',
    description: 'Update a user',
    inputSchema: { type: 'object', properties: { user_id: { type: 'number' }, name: { type: 'string' }, email: { type: 'string', format: 'email' }, token: { type: 'string' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['user_id'] }
  },
  {
    name: 'delete_user',
    description: 'Delete a user by ID',
    inputSchema: { type: 'object', properties: { user_id: { type: 'number' }, token: { type: 'string' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['user_id'] }
  },
  {
    name: 'invite_user',
    description: 'Invite a user by email',
    inputSchema: { type: 'object', properties: { email: { type: 'string', format: 'email' }, token: { type: 'string' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['email'] }
  },
  {
    name: 'remove_user',
    description: 'Remove a user from the project by ID',
    inputSchema: { type: 'object', properties: { user_id: { type: 'number' }, token: { type: 'string' }, base_url: { type: 'string' }, insecure: { type: 'boolean' }, cacert: { type: 'string' } }, required: ['user_id'] }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'create_user': {
        const token = await resolveToken(args, context);
        const res = await createUser(args.name, args.email, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_all_users': {
        const token = await resolveToken(args, context);
        const res = await getAllUsers(token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_user': {
        const token = await resolveToken(args, context);
        const res = await getUser(Number(args.user_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_user_by_email': {
        const token = await resolveToken(args, context);
        const res = await getUserByEmail(args.email, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'update_user': {
        const token = await resolveToken(args, context);
        const updates = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.email !== undefined) updates.email = args.email;
        const res = await updateUser(Number(args.user_id), updates, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'delete_user': {
        const token = await resolveToken(args, context);
        await deleteUser(Number(args.user_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      case 'invite_user': {
        const token = await resolveToken(args, context);
        const res = await inviteUser(args.email, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'remove_user': {
        const token = await resolveToken(args, context);
        await removeUser(Number(args.user_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      default:
        throw new Error(`Unknown user tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}
