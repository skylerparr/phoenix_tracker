import https from 'https';
import http from 'http';
import fs from 'fs';

export const createAgent = (url, insecure = false, cacert = '') => {
  const urlObj = new URL(url);
  if (urlObj.protocol === 'https:') {
    const agentOptions = {
      rejectUnauthorized: !insecure,
    };
    if (cacert) {
      try {
        agentOptions.ca = fs.readFileSync(cacert);
      } catch (e) {
        throw new Error(`Failed to read CA certificate: ${e.message}`);
      }
    }
    return new https.Agent(agentOptions);
  }
  return new http.Agent();
};

/**
 * Extract common request options from options object
 * @param {Object} options - Options object containing baseUrl, insecure, cacert, token
 * @returns {Object} Object with baseUrl, insecure, cacert, token
 */
export const extractRequestOptions = (options = {}) => {
  return {
    baseUrl: options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api',
    insecure: options.insecure || false,
    cacert: options.cacert || '',
    token: options.token || '',
  };
};

/**
 * Make an HTTP request with common error handling
 * @param {string} url - Full URL to request
 * @param {Object} requestOptions - Fetch request options (method, headers, body, etc.)
 * @param {string} errorMessage - Error message for failed requests
 * @returns {Promise<Response>} The response object
 */
export const makeRequest = async (url, requestOptions, errorMessage) => {
  const resp = await fetch(url, requestOptions);
  
  if (!resp.ok) {
    throw new Error(`${errorMessage} with status ${resp.status}`);
  }
  
  return resp;
};

/**
 * Build headers with authorization token
 * @param {string} token - Authorization token
 * @param {Object} additionalHeaders - Additional headers to merge
 * @returns {Object} Headers object
 */
export const buildHeaders = (token = '', additionalHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
  
  if (token) {
    headers.Authorization = token;
  }
  
  return headers;
};

/**
 * Make a GET request
 * @param {string} endpoint - API endpoint path
 * @param {string} token - Authorization token
 * @param {Object} options - Options with baseUrl, insecure, cacert
 * @param {string} errorMessage - Custom error message
 * @returns {Promise<Object>} Parsed JSON response
 */
export const getRequest = async (endpoint, token, options = {}, errorMessage = 'Request failed') => {
  const { baseUrl, insecure, cacert } = extractRequestOptions(options);
  const url = `${baseUrl}${endpoint}`;
  
  const resp = await makeRequest(
    url,
    {
      method: 'GET',
      headers: buildHeaders(token),
      agent: createAgent(url, insecure, cacert),
    },
    errorMessage
  );
  
  return resp.json();
};

/**
 * Make a POST request
 * @param {string} endpoint - API endpoint path
 * @param {Object} payload - Request body data
 * @param {string} token - Authorization token
 * @param {Object} options - Options with baseUrl, insecure, cacert
 * @param {string} errorMessage - Custom error message
 * @returns {Promise<Object>} Parsed JSON response
 */
export const postRequest = async (endpoint, payload, token, options = {}, errorMessage = 'Request failed') => {
  const { baseUrl, insecure, cacert } = extractRequestOptions(options);
  const url = `${baseUrl}${endpoint}`;
  
  const resp = await makeRequest(
    url,
    {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify(payload),
      agent: createAgent(url, insecure, cacert),
    },
    errorMessage
  );
  
  return resp.json();
};

/**
 * Make a POST request without expecting JSON response
 * @param {string} endpoint - API endpoint path
 * @param {Object} payload - Request body data
 * @param {string} token - Authorization token
 * @param {Object} options - Options with baseUrl, insecure, cacert
 * @param {string} errorMessage - Custom error message
 * @returns {Promise<void>}
 */
export const postRequestNoResponse = async (endpoint, payload, token, options = {}, errorMessage = 'Request failed') => {
  const { baseUrl, insecure, cacert } = extractRequestOptions(options);
  const url = `${baseUrl}${endpoint}`;
  
  await makeRequest(
    url,
    {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify(payload),
      agent: createAgent(url, insecure, cacert),
    },
    errorMessage
  );
};

/**
 * Make a PUT request
 * @param {string} endpoint - API endpoint path
 * @param {Object} payload - Request body data (can be empty for no-body PUTs)
 * @param {string} token - Authorization token
 * @param {Object} options - Options with baseUrl, insecure, cacert
 * @param {string} errorMessage - Custom error message
 * @returns {Promise<Object>} Parsed JSON response
 */
export const putRequest = async (endpoint, payload, token, options = {}, errorMessage = 'Request failed') => {
  const { baseUrl, insecure, cacert } = extractRequestOptions(options);
  const url = `${baseUrl}${endpoint}`;
  
  const fetchOptions = {
    method: 'PUT',
    headers: buildHeaders(token),
    agent: createAgent(url, insecure, cacert),
  };
  
  if (payload) {
    fetchOptions.body = JSON.stringify(payload);
  }
  
  const resp = await makeRequest(url, fetchOptions, errorMessage);
  
  return resp.json();
};

/**
 * Make a PUT request without expecting JSON response
 * @param {string} endpoint - API endpoint path
 * @param {Object} payload - Request body data (can be empty)
 * @param {string} token - Authorization token
 * @param {Object} options - Options with baseUrl, insecure, cacert
 * @param {string} errorMessage - Custom error message
 * @returns {Promise<void>}
 */
export const putRequestNoResponse = async (endpoint, payload, token, options = {}, errorMessage = 'Request failed') => {
  const { baseUrl, insecure, cacert } = extractRequestOptions(options);
  const url = `${baseUrl}${endpoint}`;
  
  const fetchOptions = {
    method: 'PUT',
    headers: buildHeaders(token),
    agent: createAgent(url, insecure, cacert),
  };
  
  if (payload) {
    fetchOptions.body = JSON.stringify(payload);
  }
  
  await makeRequest(url, fetchOptions, errorMessage);
};

/**
 * Make a DELETE request
 * @param {string} endpoint - API endpoint path
 * @param {string} token - Authorization token
 * @param {Object} options - Options with baseUrl, insecure, cacert
 * @param {string} errorMessage - Custom error message
 * @returns {Promise<void>}
 */
export const deleteRequest = async (endpoint, token, options = {}, errorMessage = 'Request failed') => {
  const { baseUrl, insecure, cacert } = extractRequestOptions(options);
  const url = `${baseUrl}${endpoint}`;
  
  await makeRequest(
    url,
    {
      method: 'DELETE',
      headers: buildHeaders(token),
      agent: createAgent(url, insecure, cacert),
    },
    errorMessage
  );
};
