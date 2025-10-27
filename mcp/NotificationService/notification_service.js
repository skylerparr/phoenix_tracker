import { getRequest, putRequest } from '../client.js';

export async function getNotificationsForProject(token, options = {}) {
  if (!token) throw new Error('Token is required');
  
  return getRequest('/notifications', token, options, 'Get notifications request failed');
}

export async function markNotificationAsRead(id, token, options = {}) {
  if (!id) throw new Error('Notification ID is required');
  if (!token) throw new Error('Token is required');
  
  return putRequest(`/notifications/${id}/read`, null, token, options, 'Mark notification as read request failed');
}

export async function getNotificationCountForProject(token, options = {}) {
  if (!token) throw new Error('Token is required');
  
  return getRequest('/notifications/count', token, options, 'Get notification count request failed');
}

export default {
  getNotificationsForProject,
  markNotificationAsRead,
  getNotificationCountForProject,
};