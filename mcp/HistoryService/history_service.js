import { getRequest } from '../client.js';

export async function getHistoryByIssue(issueId, token, options = {}) {
  if (!issueId) throw new Error('Issue ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/history/issue/${issueId}`, token, options, 'Get history by issue request failed');
}

export default {
  getHistoryByIssue,
};