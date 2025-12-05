import { createOwner, getAllOwners, getOwner, updateOwner, deleteOwner } from './owner_service.js';

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
    name: 'create_owner',
    description: 'Create a new owner',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'User ID (optional)' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      }
    }
  },
  {
    name: 'get_all_owners',
    description: 'Get all owners',
    inputSchema: {
      type: 'object',
      properties: {
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      }
    }
  },
  {
    name: 'get_owner',
    description: 'Get an owner by ID',
    inputSchema: {
      type: 'object',
      properties: {
        owner_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['owner_id']
    }
  },
  {
    name: 'update_owner',
    description: 'Update an owner',
    inputSchema: {
      type: 'object',
      properties: {
        owner_id: { type: 'number' },
        user_id: { type: 'number', description: 'User ID (optional)' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['owner_id']
    }
  },
  {
    name: 'delete_owner',
    description: 'Delete an owner',
    inputSchema: {
      type: 'object',
      properties: {
        owner_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['owner_id']
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'create_owner': {
        const token = await resolveToken(args, context);
        const res = await createOwner(args.user_id, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_all_owners': {
        const token = await resolveToken(args, context);
        const res = await getAllOwners(token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_owner': {
        const token = await resolveToken(args, context);
        const res = await getOwner(Number(args.owner_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'update_owner': {
        const token = await resolveToken(args, context);
        const res = await updateOwner(Number(args.owner_id), args.user_id, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'delete_owner': {
        const token = await resolveToken(args, context);
        await deleteOwner(Number(args.owner_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      default:
        throw new Error(`Unknown owner tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}