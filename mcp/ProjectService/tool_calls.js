import { createProject, getProject, getAllProjectsByUserId, deleteProject, selectProject } from './project_service.js';

/**
 * Type hints (for editors)
 * @typedef {import('../../frontend/src/models/Project.tsx').Project} Project
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
    name: 'create_project',
    description: 'Create a new project',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        token: { type: 'string', description: 'JWT token (optional if provided by context)' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['name']
    }
  },
  {
    name: 'get_project',
    description: 'Get a project by ID',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['project_id']
    }
  },
  {
    name: 'get_all_projects_by_user_id',
    description: 'List all projects for the current user',
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
    name: 'delete_project',
    description: 'Delete a project by ID',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['project_id']
    }
  },
  {
    name: 'select_project',
    description: 'Select a project for the current user',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['project_id']
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'create_project': {
        const token = await resolveToken(args, context);
        const res = await createProject(args.name, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_project': {
        const token = await resolveToken(args, context);
        const res = await getProject(Number(args.project_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_all_projects_by_user_id': {
        const token = await resolveToken(args, context);
        const res = await getAllProjectsByUserId(token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'delete_project': {
        const token = await resolveToken(args, context);
        await deleteProject(Number(args.project_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      case 'select_project': {
        const token = await resolveToken(args, context);
        const res = await selectProject(Number(args.project_id), token, opts);
        // Update token and project ID in context
        if (context.updateToken) {
          context.updateToken(res.token, res.expires_at);
        }
        if (context.updateProjectId) {
          context.updateProjectId(Number(args.project_id));
        }
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      default:
        throw new Error(`Unknown project tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}
