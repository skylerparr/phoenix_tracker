import { uploadForIssue, uploadForProjectNote, listForIssue, listUnattachedForIssue, listForProjectNote, listForComment, attachToComment, detachFromComment, downloadUpload, deleteUpload } from './upload_service.js';

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
    name: 'upload_for_issue',
    description: 'Upload a file for an issue',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'number' },
        file: { type: 'string', description: 'File data or path' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['issue_id', 'file']
    }
  },
  {
    name: 'upload_for_project_note',
    description: 'Upload a file for a project note',
    inputSchema: {
      type: 'object',
      properties: {
        project_note_id: { type: 'number' },
        file: { type: 'string', description: 'File data or path' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['project_note_id', 'file']
    }
  },
  {
    name: 'list_uploads_for_issue',
    description: 'List all uploads for an issue',
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
    name: 'list_unattached_uploads_for_issue',
    description: 'List unattached uploads for an issue',
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
    name: 'list_uploads_for_project_note',
    description: 'List uploads for a project note',
    inputSchema: {
      type: 'object',
      properties: {
        project_note_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['project_note_id']
    }
  },
  {
    name: 'list_uploads_for_comment',
    description: 'List uploads attached to a comment',
    inputSchema: {
      type: 'object',
      properties: {
        comment_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['comment_id']
    }
  },
  {
    name: 'attach_upload_to_comment',
    description: 'Attach an upload to a comment',
    inputSchema: {
      type: 'object',
      properties: {
        comment_id: { type: 'number' },
        file_upload_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['comment_id', 'file_upload_id']
    }
  },
  {
    name: 'detach_upload_from_comment',
    description: 'Detach an upload from a comment',
    inputSchema: {
      type: 'object',
      properties: {
        comment_id: { type: 'number' },
        file_upload_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['comment_id', 'file_upload_id']
    }
  },
  {
    name: 'download_upload',
    description: 'Download an upload by ID',
    inputSchema: {
      type: 'object',
      properties: {
        upload_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['upload_id']
    }
  },
  {
    name: 'delete_upload',
    description: 'Delete an upload by ID',
    inputSchema: {
      type: 'object',
      properties: {
        upload_id: { type: 'number' },
        token: { type: 'string' },
        base_url: { type: 'string' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['upload_id']
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    const opts = buildOptions(args);
    switch (name) {
      case 'upload_for_issue': {
        const token = await resolveToken(args, context);
        const res = await uploadForIssue(Number(args.issue_id), args.file, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'upload_for_project_note': {
        const token = await resolveToken(args, context);
        const res = await uploadForProjectNote(Number(args.project_note_id), args.file, token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'list_uploads_for_issue': {
        const token = await resolveToken(args, context);
        const res = await listForIssue(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'list_unattached_uploads_for_issue': {
        const token = await resolveToken(args, context);
        const res = await listUnattachedForIssue(Number(args.issue_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'list_uploads_for_project_note': {
        const token = await resolveToken(args, context);
        const res = await listForProjectNote(Number(args.project_note_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'list_uploads_for_comment': {
        const token = await resolveToken(args, context);
        const res = await listForComment(Number(args.comment_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'attach_upload_to_comment': {
        const token = await resolveToken(args, context);
        const res = await attachToComment(Number(args.comment_id), Number(args.file_upload_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'detach_upload_from_comment': {
        const token = await resolveToken(args, context);
        await detachFromComment(Number(args.comment_id), Number(args.file_upload_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      case 'download_upload': {
        const token = await resolveToken(args, context);
        const res = await downloadUpload(Number(args.upload_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'delete_upload': {
        const token = await resolveToken(args, context);
        await deleteUpload(Number(args.upload_id), token, opts);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      default:
        throw new Error(`Unknown upload tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}