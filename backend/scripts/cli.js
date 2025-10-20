import fs from 'fs';

export const die = (msg) => {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
};

export const prettyPrint = (data, output = '-') => {
  const text = JSON.stringify(data, null, 2);
  if (output === '-') {
    process.stdout.write(text + '\n');
  } else {
    fs.writeFileSync(output, text);
  }
};

export const parseArgs = (scriptName, options) => {
  const defaults = {
    email: process.env.EMAIL,
    baseUrl: process.env.BASE_URL || 'http://host.docker.internal:3001/api',
    projectId: process.env.PROJECT_ID ? parseInt(process.env.PROJECT_ID, 10) : null,
    insecure: false,
    cacert: '',
    output: '-',
  };

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--base-url':
        defaults.baseUrl = args[++i];
        break;
      case '-e':
      case '--email':
        defaults.email = args[++i];
        break;
      case '-p':
      case '--project-id':
        defaults.projectId = parseInt(args[++i], 10);
        break;
      case '--insecure':
        defaults.insecure = true;
        break;
      case '--cacert':
        defaults.cacert = args[++i];
        break;
      case '--output':
        defaults.output = args[++i];
        break;
      case '-h':
      case '--help':
        printUsage(scriptName, options);
        process.exit(0);
      default:
        die(`Unknown argument: ${args[i]}`);
    }
  }

  // Validate required options
  if (options.requireEmail && !defaults.email) {
    die('Email is required. Set EMAIL env var or use --email flag.');
  }
  if (options.requireProjectId && !defaults.projectId) {
    die('Project ID is required. Set PROJECT_ID env var or use --project-id flag.');
  }

  return defaults;
};

const printUsage = (scriptName, options) => {
  let usage = `Usage: node ${scriptName} [OPTIONS]\n\nOptions:\n`;

  if (options.includeEmail) {
    usage += `  -e, --email       Login email (default: $EMAIL; can also set env EMAIL)\n`;
  }
  if (options.includeBaseUrl) {
    usage += `  --base-url URL    API base URL (default: http://host.docker.internal:3001/api; can also set env BASE_URL)\n`;
  }
  if (options.includeProjectId) {
    usage += `  -p, --project-id  Project ID (default: $PROJECT_ID; can also set env PROJECT_ID)\n`;
  }
  if (options.includeOutput) {
    usage += `  --output FILE     Write response JSON to FILE (default: stdout)\n`;
  }

  usage += `  --insecure        Allow insecure TLS for local dev\n`;
  usage += `  --cacert FILE     Use CA certificate file for TLS verification\n`;
  usage += `  -h, --help        Show this help message\n`;

  process.stderr.write(usage);
};
