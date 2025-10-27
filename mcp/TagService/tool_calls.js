import { createTag, getAllTags, getTag, updateTag, deleteTag, getTagsWithCounts } from './tag_service.js';

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
    name: 'create_tag',
    description: 'Create a new tag',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        is_epic: { type: 'boolean', description: 'Whether this is an epic tag' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['name', 'is_epic']
    }
  },
  {
    name: 'get_all_tags',
    description: 'Get all tags',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      }
    }
  },
  {
    name: 'get_tag',
    description: 'Get a tag by ID',
    inputSchema: {
      type: 'object',
      properties: {
        tag_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['tag_id']
    }
  },
  {
    name: 'update_tag',
    description: 'Update a tag',
    inputSchema: {
      type: 'object',
      properties: {
        tag_id: { type: 'number' },
        name: { type: 'string' },
        is_epic: { type: 'boolean' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['tag_id']
    }
  },
  {
    name: 'delete_tag',
    description: 'Delete a tag',
    inputSchema: {
      type: 'object',
      properties: {
        tag_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['tag_id']
    }
  },
  {
    name: 'get_tags_with_counts',
    description: 'Get tags with issue counts',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      }
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'create_tag': {
        const token = await resolveToken(args, context);
        const res = await createTag(args.name, args.is_epic, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_all_tags': {
        const token = await resolveToken(args, context);
        const res = await getAllTags(token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_tag': {
        const token = await resolveToken(args, context);
        const res = await getTag(Number(args.tag_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'update_tag': {
        const token = await resolveToken(args, context);
        const res = await updateTag(Number(args.tag_id), args.name, args.is_epic, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'delete_tag': {
        const token = await resolveToken(args, context);
        await deleteTag(Number(args.tag_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      case 'get_tags_with_counts': {
        const token = await resolveToken(args, context);
        const res = await getTagsWithCounts(token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      default:
        throw new Error(`Unknown tag tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}