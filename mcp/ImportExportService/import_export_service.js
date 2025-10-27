import { postRequest, getRequest } from '../client.js';

export async function exportData(token, options = {}) {
  if (!token) throw new Error('Token is required');
  
  return getRequest('/export', token, options, 'Export data request failed');
}

export async function importData(data, token, options = {}) {
  if (!data) throw new Error('Data is required');
  if (!token) throw new Error('Token is required');
  
  await postRequest('/import', data, token, options, 'Import data request failed');
}

export default {
  exportData,
  importData,
};