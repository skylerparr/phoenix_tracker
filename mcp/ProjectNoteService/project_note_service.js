import { postRequest, getRequest, putRequest, deleteRequest } from '../client.js';

export async function createProjectNote(title, detail, token, options = {}) {
  if (!title) throw new Error('Title is required');
  if (!detail) throw new Error('Detail is required');
  if (!token) throw new Error('Token is required');
  
  const payload = { title, detail };
  return postRequest('/project-notes', payload, token, options, 'Create project note request failed');
}

export async function getProjectNoteById(id, token, options = {}) {
  if (!id) throw new Error('Project note ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/project-notes/${id}`, token, options, 'Get project note request failed');
}

export async function getProjectNotesByProject(token, options = {}) {
  if (!token) throw new Error('Token is required');
  
  return getRequest('/project-notes/project', token, options, 'Get project notes request failed');
}

export async function updateProjectNote(id, title, detail, token, options = {}) {
  if (!id) throw new Error('Project note ID is required');
  if (!token) throw new Error('Token is required');
  
  const payload = {};
  if (title !== undefined) payload.title = title;
  if (detail !== undefined) payload.detail = detail;
  
  return putRequest(`/project-notes/${id}`, payload, token, options, 'Update project note request failed');
}

export async function deleteProjectNote(id, token, options = {}) {
  if (!id) throw new Error('Project note ID is required');
  if (!token) throw new Error('Token is required');
  
  await deleteRequest(`/project-notes/${id}`, token, options, 'Delete project note request failed');
}

export default {
  createProjectNote,
  getProjectNoteById,
  getProjectNotesByProject,
  updateProjectNote,
  deleteProjectNote,
};