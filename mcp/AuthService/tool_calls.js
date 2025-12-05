import { login, register, logout, switchProject } from './auth_service.js';

/**
 * Type hints (for editors)
 * @typedef {import('../../frontend/src/services/AuthService.tsx').AuthResponse} AuthResponse
 */

// Build client options from args
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
    name: 'auth_login',
    description: 'Login with email to obtain a JWT token',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', description: 'User email' },
        insecure: { type: 'boolean', description: 'Allow insecure TLS' },
        cacert: { type: 'string', description: 'Path to custom CA cert file' }
      },
      required: ['email']
    }
  },
  {
    name: 'auth_register',
    description: 'Register a new user and obtain a JWT token',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'User name' },
        email: { type: 'string', format: 'email', description: 'User email' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['name', 'email']
    }
  },
  {
    name: 'auth_logout',
    description: 'Logout current user',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'User ID' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['user_id']
    }
  },
  {
    name: 'auth_switch_project',
    description: 'Switch active project using project ID and current token',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'number', description: 'Project ID to switch to' },
        insecure: { type: 'boolean' },
        cacert: { type: 'string' }
      },
      required: ['project_id']
    }
  }
];

export async function handleToolCall(name, args = {}, context = {}) {
  try {
    switch (name) {
      case 'auth_login': {
        const resp = await login(args.email, buildOptions(args));
        // Update token in context
        if (context.updateToken) {
          context.updateToken(resp.token, resp.expires_at);
        }
        return { content: [{ type: 'text', text: JSON.stringify(resp, null, 2) }] };
      }
      case 'auth_register': {
        const resp = await register(args.name, args.email, buildOptions(args));
        // Update token in context
        if (context.updateToken) {
          context.updateToken(resp.token, resp.expires_at);
        }
        return { content: [{ type: 'text', text: JSON.stringify(resp, null, 2) }] };
      }
      case 'auth_logout': {
        const token = await resolveToken(args, context);
        await logout(Number(args.user_id), { ...buildOptions(args), token });
        // Clear token in context
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      }
      case 'auth_switch_project': {
        const token = await resolveToken(args, context);
        const resp = await switchProject(Number(args.project_id), token, buildOptions(args));
        context.updateToken(resp.token, resp.expires_at);
        return { content: [{ type: 'text', text: JSON.stringify(resp, null, 2) }] };
      }
      default:
        throw new Error(`Unknown auth tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}
