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