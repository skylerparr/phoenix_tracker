import { getStatusArray, getStatusMap, getUnfinishedStatuses, getStatusIdByName } from './status_service.js';

export const tools = [
  {
    name: 'get_status_array',
    description: 'Get all available issue statuses as an array',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_status_map',
    description: 'Get status ID to name mapping',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_unfinished_statuses',
    description: 'Get status IDs for unfinished issues (everything except delivered)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_status_id_by_name',
    description: 'Get status ID for a status name',
    inputSchema: {
      type: 'object',
      properties: {
        status_name: { type: 'string', description: 'Status name to lookup' }
      },
      required: ['status_name']
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    switch (name) {
      case 'get_status_array': {
        const res = getStatusArray();
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_status_map': {
        const map = getStatusMap();
        const res = Object.fromEntries(map);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_unfinished_statuses': {
        const res = getUnfinishedStatuses();
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_status_id_by_name': {
        const res = getStatusIdByName(args.status_name);
        return { content: [{ type: 'text', text: JSON.stringify({ id: res }, null, 2) }] };
      }
      default:
        throw new Error(`Unknown status tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}