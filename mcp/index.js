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

const POINTS = [0, 1, 2, 3, 5, 8];

const WORK_TYPE_FEATURE = 0;
const WORK_TYPE_BUG = 1;
const WORK_TYPE_CHORE = 2;
const WORK_TYPE_RELEASE = 3;

const WORK_TYPE_MAP = {
  feature: WORK_TYPE_FEATURE,
  bug: WORK_TYPE_BUG,
  chore: WORK_TYPE_CHORE,
  release: WORK_TYPE_RELEASE,
}

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
            title: {type: "string", description: "Issue title"},
            points: {type: "number", description: "Story points for the issue", enum: POINTS},
            description: {type: "string", description: "Detailed description of the issue"},
            work_type: {
              type: "string",
              description: "Type of work: feature, bug, chore, or release",
              enum: Object.keys(WORK_TYPE_MAP)
            }
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
        const workTypeInt = args.work_type ? WORK_TYPE_MAP[args.work_type] : WORK_TYPE_FEATURE;

        const payload = {
          title: args.title,
          points: args.points,
          description: args.description || "",
          workType: workTypeInt
        };
        const issue = await doCreateIssue(payload)
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
