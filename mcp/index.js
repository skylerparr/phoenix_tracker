#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { login, switchProject } from "./AuthService/auth_service.js";
import { getAllIssues, createIssue } from "./IssueService/issue_service.js";

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
  if(projectToken) {
    return true;
  }
  const response = await login(CONFIG.email);
  projectToken = response.token;
  tokenExpiry = response.expires_at;

  const switchProjectResponse = await switchProject(CONFIG.projectId, projectToken);
  projectToken = switchProjectResponse.token;
  tokenExpiry = switchProjectResponse.expires_at;

  return true;
}

async function listIssues() {
  if(!await doLogin()) {
    return {error: "Unable to login and switch project"};
  }

  return await getAllIssues(projectToken);
}

async function doCreateIssue(params) {
  if(!await doLogin()) {
    return {error: "Unable to login and switch project"};
  }
  return await createIssue(params.title, projectToken, params);
}

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_issues",
        description: "List all issues in the backlog",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create_issue",
        description: "Create a new issue for the backlog",
        inputSchema: {
          type: "object",
          properties: {
            title: {type: "string", description: "Issue title"}
          },
          required: ["title"]
        }
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "list_issues": {
        const issues = await listIssues();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(issues, null, 2),
            },
          ],
        };
      }
      case "create_issue": {
        const issue = await doCreateIssue(args)
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(issue, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
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
  // console.error(await listIssues());

  // Keep process alive by preventing stdin from closing
  process.stdin.resume();
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
