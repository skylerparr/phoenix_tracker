import { postRequest, getRequest, putRequest, deleteRequest } from '../client.js';

export async function createComment(content, issueId, token, options = {}) {
  if (!content) throw new Error('Content is required');
  if (!issueId) throw new Error('Issue ID is required');
  if (!token) throw new Error('Token is required');
  
  const payload = { content, issueId };
  return postRequest('/comments', payload, token, options, 'Create comment request failed');
}

export async function getCommentsByIssue(issueId, token, options = {}) {
  if (!issueId) throw new Error('Issue ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/comments/issue/${issueId}`, token, options, 'Get comments by issue request failed');
}

export async function getCommentsByUser(userId, token, options = {}) {
  if (!userId) throw new Error('User ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/comments/user/${userId}`, token, options, 'Get comments by user request failed');
}

export async function updateComment(id, content, token, options = {}) {
  if (!id) throw new Error('Comment ID is required');
  if (!content) throw new Error('Content is required');
  if (!token) throw new Error('Token is required');
  
  return putRequest(`/comments/${id}`, { content }, token, options, 'Update comment request failed');
}

export async function deleteComment(id, token, options = {}) {
  if (!id) throw new Error('Comment ID is required');
  if (!token) throw new Error('Token is required');
  
  await deleteRequest(`/comments/${id}`, token, options, 'Delete comment request failed');
}

export default {
  createComment,
  getCommentsByIssue,
  getCommentsByUser,
  updateComment,
  deleteComment,
};