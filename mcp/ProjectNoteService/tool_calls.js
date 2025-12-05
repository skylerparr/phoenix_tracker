import { createProjectNote, getProjectNoteById, getProjectNotesByProject, updateProjectNote, deleteProjectNote } from './project_note_service.js';

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
    name: 'create_project_note',
    description: 'Create a new project note',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        detail: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['title', 'detail']
    }
  },
  {
    name: 'get_project_note_by_id',
    description: 'Get a project note by ID',
    inputSchema: {
      type: 'object',
      properties: {
        note_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['note_id']
    }
  },
  {
    name: 'get_project_notes_by_project',
    description: 'Get all project notes for the current project',
    inputSchema: {
      type: 'object',
      properties: {
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      }
    }
  },
  {
    name: 'update_project_note',
    description: 'Update a project note',
    inputSchema: {
      type: 'object',
      properties: {
        note_id: { type: 'number' },
        title: { type: 'string' },
        detail: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['note_id']
    }
  },
  {
    name: 'delete_project_note',
    description: 'Delete a project note',
    inputSchema: {
      type: 'object',
      properties: {
        note_id: { type: 'number' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['note_id']
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'create_project_note': {
        const token = await resolveToken(args, context);
        const res = await createProjectNote(args.title, args.detail, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_project_note_by_id': {
        const token = await resolveToken(args, context);
        const res = await getProjectNoteById(Number(args.note_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_project_notes_by_project': {
        const token = await resolveToken(args, context);
        const res = await getProjectNotesByProject(token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'update_project_note': {
        const token = await resolveToken(args, context);
        const res = await updateProjectNote(Number(args.note_id), args.title, args.detail, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'delete_project_note': {
        const token = await resolveToken(args, context);
        await deleteProjectNote(Number(args.note_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      default:
        throw new Error(`Unknown project note tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}