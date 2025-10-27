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
import { tools as blockerTools, handleToolCall as handleBlockerTool } from "./BlockerService/tool_calls.js";
import { tools as commentTools, handleToolCall as handleCommentTool } from "./CommentService/tool_calls.js";
import { tools as historyTools, handleToolCall as handleHistoryTool } from "./HistoryService/tool_calls.js";
import { tools as importExportTools, handleToolCall as handleImportExportTool } from "./ImportExportService/tool_calls.js";
import { tools as issueAssigneeTools, handleToolCall as handleIssueAssigneeTool } from "./IssueAssigneeService/tool_calls.js";
import { tools as issueTools, handleToolCall as handleIssueTool } from "./IssueService/tool_calls.js";
import { tools as issueTagTools, handleToolCall as handleIssueTagTool } from "./IssueTagService/tool_calls.js";
import { tools as notificationTools, handleToolCall as handleNotificationTool } from "./NotificationService/tool_calls.js";
import { tools as ownerTools, handleToolCall as handleOwnerTool } from "./OwnerService/tool_calls.js";
import { tools as projectNoteHistoryTools, handleToolCall as handleProjectNoteHistoryTool } from "./ProjectNoteHistoryService/tool_calls.js";
import { tools as projectNoteTools, handleToolCall as handleProjectNoteTool } from "./ProjectNoteService/tool_calls.js";
import { tools as projectTools, handleToolCall as handleProjectTool } from "./ProjectService/tool_calls.js";
import { tools as statusTools, handleToolCall as handleStatusTool } from "./StatusService/tool_calls.js";
import { tools as tagTools, handleToolCall as handleTagTool } from "./TagService/tool_calls.js";
import { tools as taskTools, handleToolCall as handleTaskTool } from "./TaskService/tool_calls.js";
import { tools as uploadTools, handleToolCall as handleUploadTool } from "./UploadService/tool_calls.js";
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

const allTools = [
  ...authTools,
  ...blockerTools,
  ...commentTools,
  ...historyTools,
  ...importExportTools,
  ...issueAssigneeTools,
  ...issueTools,
  ...issueTagTools,
  ...notificationTools,
  ...ownerTools,
  ...projectNoteHistoryTools,
  ...projectNoteTools,
  ...projectTools,
  ...statusTools,
  ...tagTools,
  ...taskTools,
  ...uploadTools,
  ...userTools,
];

const toolNameToHandler = new Map();
for (const t of authTools) toolNameToHandler.set(t.name, handleAuthTool);
for (const t of blockerTools) toolNameToHandler.set(t.name, handleBlockerTool);
for (const t of commentTools) toolNameToHandler.set(t.name, handleCommentTool);
for (const t of historyTools) toolNameToHandler.set(t.name, handleHistoryTool);
for (const t of importExportTools) toolNameToHandler.set(t.name, handleImportExportTool);
for (const t of issueAssigneeTools) toolNameToHandler.set(t.name, handleIssueAssigneeTool);
for (const t of issueTools) toolNameToHandler.set(t.name, handleIssueTool);
for (const t of issueTagTools) toolNameToHandler.set(t.name, handleIssueTagTool);
for (const t of notificationTools) toolNameToHandler.set(t.name, handleNotificationTool);
for (const t of ownerTools) toolNameToHandler.set(t.name, handleOwnerTool);
for (const t of projectNoteHistoryTools) toolNameToHandler.set(t.name, handleProjectNoteHistoryTool);
for (const t of projectNoteTools) toolNameToHandler.set(t.name, handleProjectNoteTool);
for (const t of projectTools) toolNameToHandler.set(t.name, handleProjectTool);
for (const t of statusTools) toolNameToHandler.set(t.name, handleStatusTool);
for (const t of tagTools) toolNameToHandler.set(t.name, handleTagTool);
for (const t of taskTools) toolNameToHandler.set(t.name, handleTaskTool);
for (const t of uploadTools) toolNameToHandler.set(t.name, handleUploadTool);
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
