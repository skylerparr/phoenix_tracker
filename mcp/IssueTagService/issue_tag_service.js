import { postRequest, getRequest, deleteRequest } from '../client.js';

export async function createIssueTag(issueId, tagId, token, options = {}) {
  if (!issueId) throw new Error('Issue ID is required');
  if (!tagId) throw new Error('Tag ID is required');
  if (!token) throw new Error('Token is required');
  
  const payload = { issueId, tagId };
  return postRequest('/issue-tags', payload, token, options, 'Create issue tag request failed');
}

export async function getIssueTagsByIssueId(issueId, token, options = {}) {
  if (!issueId) throw new Error('Issue ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/issue-tags/issue/${issueId}`, token, options, 'Get issue tags request failed');
}

export async function getIssuesByTagId(tagId, token, options = {}) {
  if (!tagId) throw new Error('Tag ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/issue-tags/tag/${tagId}`, token, options, 'Get issues by tag request failed');
}

export async function deleteIssueTag(issueId, tagId, token, options = {}) {
  if (!issueId) throw new Error('Issue ID is required');
  if (!tagId) throw new Error('Tag ID is required');
  if (!token) throw new Error('Token is required');
  
  await deleteRequest(`/issue-tags/${issueId}/${tagId}`, token, options, 'Delete issue tag request failed');
}

export default {
  createIssueTag,
  getIssueTagsByIssueId,
  getIssuesByTagId,
  deleteIssueTag,
};