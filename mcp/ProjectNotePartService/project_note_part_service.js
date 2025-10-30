import { putRequest } from '../client.js';

export async function updateProjectNotePartContent(id, content, token, options = {}) {
  if (!id) {
    throw new Error('Project note part ID is required');
  }

  if (!content) {
    throw new Error('Content is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const payload = {
    content,
  };

  return putRequest(`/project-note-parts/${id}/content`, payload, token, options, 'Update project note part content request failed');
}

export default {
  updateProjectNotePartContent,
};
