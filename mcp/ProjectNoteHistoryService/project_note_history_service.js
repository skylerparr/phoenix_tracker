import { getRequest } from '../client.js';

export async function getHistoryByProjectNote(projectNoteId, token, options = {}) {
  if (!projectNoteId) throw new Error('Project note ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/history/project-note/${projectNoteId}`, token, options, 'Get history by project note request failed');
}

export default {
  getHistoryByProjectNote,
};