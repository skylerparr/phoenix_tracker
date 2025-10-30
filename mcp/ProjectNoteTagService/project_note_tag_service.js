import { postRequest, getRequest, deleteRequest } from '../client.js';

export async function getProjectNoteTagByTagName(tagName, token, options = {}) {
  if (!tagName) {
    throw new Error('Tag name is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest(`/project-note-tags/tag/${tagName}`, token, options, 'Get project note tag by tag name request failed');
}

export default {
  getProjectNoteTagByTagName,
};
