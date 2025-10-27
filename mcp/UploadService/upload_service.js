import { getRequest, postRequest, deleteRequest } from '../client.js';
import fs from 'fs';

export async function uploadForIssue(issueId, file, token, options = {}) {
  if (!issueId) throw new Error('Issue ID is required');
  if (!file) throw new Error('File is required');
  if (!token) throw new Error('Token is required');
  
  // Note: This is a simplified approach - in practice you'd need to handle FormData/multipart uploads
  // For now, we'll assume the file data is passed as base64 or similar
  const payload = { file };
  return postRequest(`/issues/${issueId}/uploads`, payload, token, options, 'Upload for issue request failed');
}

export async function uploadForProjectNote(projectNoteId, file, token, options = {}) {
  if (!projectNoteId) throw new Error('Project note ID is required');
  if (!file) throw new Error('File is required');
  if (!token) throw new Error('Token is required');
  
  const payload = { file };
  return postRequest(`/project-notes/${projectNoteId}/uploads`, payload, token, options, 'Upload for project note request failed');
}

export async function listForIssue(issueId, token, options = {}) {
  if (!issueId) throw new Error('Issue ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/issues/${issueId}/uploads`, token, options, 'List uploads for issue request failed');
}

export async function listUnattachedForIssue(issueId, token, options = {}) {
  if (!issueId) throw new Error('Issue ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/issues/${issueId}/uploads/unattached`, token, options, 'List unattached uploads request failed');
}

export async function listForProjectNote(projectNoteId, token, options = {}) {
  if (!projectNoteId) throw new Error('Project note ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/project-notes/${projectNoteId}/uploads`, token, options, 'List uploads for project note request failed');
}

export async function listForComment(commentId, token, options = {}) {
  if (!commentId) throw new Error('Comment ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/comments/${commentId}/uploads`, token, options, 'List uploads for comment request failed');
}

export async function attachToComment(commentId, fileUploadId, token, options = {}) {
  if (!commentId) throw new Error('Comment ID is required');
  if (!fileUploadId) throw new Error('File upload ID is required');
  if (!token) throw new Error('Token is required');
  
  return postRequest(`/uploads/${fileUploadId}/comments/${commentId}`, {}, token, options, 'Attach to comment request failed');
}

export async function detachFromComment(commentId, fileUploadId, token, options = {}) {
  if (!commentId) throw new Error('Comment ID is required');
  if (!fileUploadId) throw new Error('File upload ID is required');
  if (!token) throw new Error('Token is required');
  
  await deleteRequest(`/comments/${commentId}/uploads/${fileUploadId}`, token, options, 'Detach from comment request failed');
}

export async function downloadUpload(uploadId, token, options = {}) {
  if (!uploadId) throw new Error('Upload ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/uploads/${uploadId}`, token, options, 'Download upload request failed');
}

export async function deleteUpload(uploadId, token, options = {}) {
  if (!uploadId) throw new Error('Upload ID is required');
  if (!token) throw new Error('Token is required');
  
  await deleteRequest(`/uploads/${uploadId}`, token, options, 'Delete upload request failed');
}

export default {
  uploadForIssue,
  uploadForProjectNote,
  listForIssue,
  listUnattachedForIssue,
  listForProjectNote,
  listForComment,
  attachToComment,
  detachFromComment,
  downloadUpload,
  deleteUpload,
};