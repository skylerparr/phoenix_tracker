import { postRequest, getRequest, deleteRequest } from '../client.js';

export async function createIssueAssignee(issueId, userId, token, options = {}) {
  if (!issueId) throw new Error('Issue ID is required');
  if (!userId) throw new Error('User ID is required');
  if (!token) throw new Error('Token is required');
  
  const payload = { issueId, userId };
  return postRequest('/issue-assignees', payload, token, options, 'Create issue assignee request failed');
}

export async function getIssueAssigneesByIssueId(issueId, token, options = {}) {
  if (!issueId) throw new Error('Issue ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/issue-assignees/issue/${issueId}`, token, options, 'Get issue assignees request failed');
}

export async function getUserAssigneesByUserId(userId, token, options = {}) {
  if (!userId) throw new Error('User ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/issue-assignees/user/${userId}`, token, options, 'Get user assignees request failed');
}

export async function deleteIssueAssignee(issueId, userId, token, options = {}) {
  if (!issueId) throw new Error('Issue ID is required');
  if (!userId) throw new Error('User ID is required');
  if (!token) throw new Error('Token is required');
  
  await deleteRequest(`/issue-assignees/${issueId}/${userId}`, token, options, 'Delete issue assignee request failed');
}

export default {
  createIssueAssignee,
  getIssueAssigneesByIssueId,
  getUserAssigneesByUserId,
  deleteIssueAssignee,
};