import { createAgent } from '../client.js';

export async function createIssue(title, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!title) {
    throw new Error('Title is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const payload = JSON.stringify({
    title,
    priority: 10,
    status: 0,
    isIcebox: false,
    workType: 0,
    description: options.description,
    points: options.points,
    targetReleaseAt: options.targetReleaseAt,
  });

  const resp = await fetch(`${baseUrl}/issues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: payload,
    agent: createAgent(`${baseUrl}/issues`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Create issue request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function getIssue(issueId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/${issueId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/${issueId}`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Get issue request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function updateIssue(issueId, updates, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const payload = JSON.stringify(updates);

  const resp = await fetch(`${baseUrl}/issues/${issueId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: payload,
    agent: createAgent(`${baseUrl}/issues/${issueId}`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Update issue request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function deleteIssue(issueId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/${issueId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/${issueId}`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Delete issue request failed with status ${resp.status}`);
  }
}

export async function startIssue(issueId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/${issueId}/start`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/${issueId}/start`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Start issue request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function finishIssue(issueId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/${issueId}/finish`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/${issueId}/finish`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Finish issue request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function deliverIssue(issueId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/${issueId}/deliver`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/${issueId}/deliver`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Deliver issue request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function acceptIssue(issueId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/${issueId}/accept`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/${issueId}/accept`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Accept issue request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function rejectIssue(issueId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/${issueId}/reject`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/${issueId}/reject`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Reject issue request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function getAllIssues(token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Get all issues request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function getMyIssues(token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/me`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Get my issues request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function getIssuesByTag(tagId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!tagId) {
    throw new Error('Tag ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/tag/${tagId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/tag/${tagId}`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Get issues by tag request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function getIssuesByUser(userId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/user/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/user/${userId}`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Get issues by user request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function getAllAccepted(token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/accepted`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/accepted`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Get all accepted issues request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function getAllIcebox(token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/icebox`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/icebox`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Get all icebox issues request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function getWeeklyPointsAverage(token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!token) {
    throw new Error('Token is required');
  }

  const resp = await fetch(`${baseUrl}/issues/weekly-points-average`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/issues/weekly-points-average`, insecure, cacert),
  });

  if (!resp.ok) {
    throw new Error(`Get weekly points average request failed with status ${resp.status}`);
  }

  return resp.json();
}

export default {
  createIssue,
  getIssue,
  updateIssue,
  deleteIssue,
  startIssue,
  finishIssue,
  deliverIssue,
  acceptIssue,
  rejectIssue,
  getAllIssues,
  getMyIssues,
  getIssuesByTag,
  getIssuesByUser,
  getAllAccepted,
  getAllIcebox,
  getWeeklyPointsAverage,
};
