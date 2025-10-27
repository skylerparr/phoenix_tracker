import { createTask, getTaskById, getTasksByIssue, updateTask, deleteTask } from './task_service.js';

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
    name: 'create_task',
    description: 'Create a task for an issue',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        issue_id: { type: 'number' },
        completed: { type: 'boolean' },
        percent: { type: 'number', description: 'Completion percentage (0-100)' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['title', 'issue_id', 'completed', 'percent']
    }
  },
  {
    name: 'get_task_by_id',
    description: 'Get a task by ID',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'get_tasks_by_issue',
    description: 'Get all tasks for an issue',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['issue_id']
    }
  },
  {
    name: 'update_task',
    description: 'Update a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'number' },
        title: { type: 'string' },
        completed: { type: 'boolean' },
        percent: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'delete_task',
    description: 'Delete a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['task_id']
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'create_task': {
        const token = await resolveToken(args, context);
        const res = await createTask(args.title, Number(args.issue_id), args.completed, args.percent, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_task_by_id': {
        const token = await resolveToken(args, context);
        const res = await getTaskById(Number(args.task_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_tasks_by_issue': {
        const token = await resolveToken(args, context);
        const res = await getTasksByIssue(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'update_task': {
        const token = await resolveToken(args, context);
        const res = await updateTask(Number(args.task_id), args.title, args.completed, args.percent, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'delete_task': {
        const token = await resolveToken(args, context);
        await deleteTask(Number(args.task_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      default:
        throw new Error(`Unknown task tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}