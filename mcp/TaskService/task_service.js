import { postRequest, getRequest, putRequest, deleteRequest } from '../client.js';

export async function createTask(title, issueId, completed, percent, token, options = {}) {
  if (!title) throw new Error('Title is required');
  if (!issueId) throw new Error('Issue ID is required');
  if (typeof completed !== 'boolean') throw new Error('Completed must be a boolean');
  if (typeof percent !== 'number') throw new Error('Percent must be a number');
  if (!token) throw new Error('Token is required');
  
  const payload = { title, issueId, completed, percent };
  return postRequest('/tasks', payload, token, options, 'Create task request failed');
}

export async function getTaskById(id, token, options = {}) {
  if (!id) throw new Error('Task ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/tasks/${id}`, token, options, 'Get task request failed');
}

export async function getTasksByIssue(issueId, token, options = {}) {
  if (!issueId) throw new Error('Issue ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/tasks/issue/${issueId}`, token, options, 'Get tasks by issue request failed');
}

export async function updateTask(id, title, completed, percent, token, options = {}) {
  if (!id) throw new Error('Task ID is required');
  if (!token) throw new Error('Token is required');
  
  const payload = {};
  if (title !== undefined) payload.title = title;
  if (completed !== undefined) payload.completed = completed;
  if (percent !== undefined) payload.percent = percent;
  
  return putRequest(`/tasks/${id}`, payload, token, options, 'Update task request failed');
}

export async function deleteTask(id, token, options = {}) {
  if (!id) throw new Error('Task ID is required');
  if (!token) throw new Error('Token is required');
  
  await deleteRequest(`/tasks/${id}`, token, options, 'Delete task request failed');
}

export default {
  createTask,
  getTaskById,
  getTasksByIssue,
  updateTask,
  deleteTask,
};