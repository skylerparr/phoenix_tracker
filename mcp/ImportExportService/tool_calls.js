import { exportData, importData } from './import_export_service.js';

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
    name: 'export_data',
    description: 'Export all project data',
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
    name: 'import_data',
    description: 'Import project data',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'object', description: 'Data object containing issues array' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['data']
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'export_data': {
        const token = await resolveToken(args, context);
        const res = await exportData(token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'import_data': {
        const token = await resolveToken(args, context);
        await importData(args.data, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      default:
        throw new Error(`Unknown import/export tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}