#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Service imports
import { login, switchProject } from "./AuthService/auth_service.js";
import { tools as authTools, handleToolCall as handleAuthTool } from "./AuthService/tool_calls.js";
import { tools as issueTools, handleToolCall as handleIssueTool } from "./IssueService/tool_calls.js";
import { tools as projectTools, handleToolCall as handleProjectTool } from "./ProjectService/tool_calls.js";
import { tools as userTools, handleToolCall as handleUserTool } from "./UserService/tool_calls.js";

// Configuration - will come from Claude Desktop config
const CONFIG = {
  baseUrl: process.env.ISSUE_TRACKER_BASE_URL,
  email: process.env.ISSUE_TRACKER_EMAIL,
  projectId: process.env.ISSUE_TRACKER_PROJECT_ID,
};

// Auth token cache
let projectToken = null;
let tokenExpiry = null;

const server = new Server(
  {
    name: "issue-tracker-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

async function doLogin() {
  if (projectToken) {
    return projectToken;
  }
  const opts = CONFIG.baseUrl ? { baseUrl: CONFIG.baseUrl } : {};
  const response = await login(CONFIG.email, opts);
  projectToken = response.token;
  tokenExpiry = response.expires_at;

  const switchProjectResponse = await switchProject(CONFIG.projectId, projectToken, opts);
  projectToken = switchProjectResponse.token;
  tokenExpiry = switchProjectResponse.expires_at;

  return projectToken;
}

const allTools = [...authTools, ...issueTools, ...projectTools, ...userTools];
const toolNameToHandler = new Map();
for (const t of authTools) toolNameToHandler.set(t.name, handleAuthTool);
for (const t of issueTools) toolNameToHandler.set(t.name, handleIssueTool);
for (const t of projectTools) toolNameToHandler.set(t.name, handleProjectTool);
for (const t of userTools) toolNameToHandler.set(t.name, handleUserTool);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args = {} } = request.params;
    const handler = toolNameToHandler.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const context = {
      token: projectToken,
      getToken: async () => await doLogin(),
    };

    const argsWithDefaults = { ...(args || {}) };
    if (CONFIG.baseUrl && argsWithDefaults.base_url === undefined) {
      argsWithDefaults.base_url = CONFIG.baseUrl;
    }

    return await handler(name, argsWithDefaults, context);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  // Validate config
  if (!CONFIG.baseUrl || !CONFIG.email || !CONFIG.projectId) {
    console.error("Error: Missing required environment variables:");
    console.error("  ISSUE_TRACKER_BASE_URL");
    console.error("  ISSUE_TRACKER_EMAIL");
    console.error("  ISSUE_TRACKER_PROJECT_ID");
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Issue Tracker MCP Server running on stdio");

  // Keep process alive by preventing stdin from closing
  process.stdin.resume();
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
