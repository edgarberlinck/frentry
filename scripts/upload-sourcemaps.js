#!/usr/bin/env node

/**
 * Frentry Source Map Uploader
 * 
 * Usage:
 *   node scripts/upload-sourcemaps.js --project-id <id> --version <version> --dir <dir>
 * 
 * Or with environment variables:
 *   FRENTRY_PROJECT_ID=xxx FRENTRY_VERSION=1.0.0 node scripts/upload-sourcemaps.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  projectId: process.env.FRENTRY_PROJECT_ID,
  version: process.env.FRENTRY_VERSION,
  dir: process.env.FRENTRY_SOURCEMAP_DIR || './dist',
  apiUrl: process.env.FRENTRY_API_URL || 'http://localhost:3000',
  authToken: process.env.FRENTRY_AUTH_TOKEN,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project-id' && args[i + 1]) {
    config.projectId = args[i + 1];
    i++;
  } else if (args[i] === '--version' && args[i + 1]) {
    config.version = args[i + 1];
    i++;
  } else if (args[i] === '--dir' && args[i + 1]) {
    config.dir = args[i + 1];
    i++;
  } else if (args[i] === '--api-url' && args[i + 1]) {
    config.apiUrl = args[i + 1];
    i++;
  } else if (args[i] === '--token' && args[i + 1]) {
    config.authToken = args[i + 1];
    i++;
  }
}

// Validate required fields
if (!config.projectId || !config.version) {
  console.error('Error: --project-id and --version are required');
  console.error('');
  console.error('Usage:');
  console.error('  node scripts/upload-sourcemaps.js --project-id <id> --version <version> [--dir <dir>]');
  console.error('');
  console.error('Environment variables:');
  console.error('  FRENTRY_PROJECT_ID    - Project ID');
  console.error('  FRENTRY_VERSION       - Release version');
  console.error('  FRENTRY_SOURCEMAP_DIR - Directory containing .js.map files (default: ./dist)');
  console.error('  FRENTRY_API_URL       - API URL (default: http://localhost:3000)');
  console.error('  FRENTRY_AUTH_TOKEN    - Authentication token (optional)');
  process.exit(1);
}

// Find all .map files recursively
function findSourceMaps(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findSourceMaps(filePath, fileList);
    } else if (file.endsWith('.js.map')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Upload source maps
async function uploadSourceMaps() {
  console.log(`🔍 Searching for source maps in: ${config.dir}`);
  
  if (!fs.existsSync(config.dir)) {
    console.error(`❌ Directory not found: ${config.dir}`);
    process.exit(1);
  }
  
  const mapFiles = findSourceMaps(config.dir);
  
  if (mapFiles.length === 0) {
    console.log('⚠️  No source map files found (.js.map)');
    process.exit(0);
  }
  
  console.log(`📦 Found ${mapFiles.length} source map(s)`);
  
  const sourceMaps = mapFiles.map(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath).replace('.map', '');
    return { fileName, content };
  });
  
  const payload = {
    version: config.version,
    sourceMaps,
  };
  
  const url = new URL(`/api/projects/${config.projectId}/releases`, config.apiUrl);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (config.authToken) {
    options.headers['Authorization'] = `Bearer ${config.authToken}`;
  }
  
  console.log(`🚀 Uploading to: ${config.apiUrl}/api/projects/${config.projectId}/releases`);
  console.log(`📌 Version: ${config.version}`);
  
  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Source maps uploaded successfully!');
          try {
            const response = JSON.parse(data);
            console.log(`   Release ID: ${response.releaseId}`);
          } catch (e) {
            // Ignore parse errors
          }
          resolve();
        } else {
          console.error(`❌ Upload failed with status ${res.statusCode}`);
          console.error(data);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Upload failed:', error.message);
      reject(error);
    });
    
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// Run
uploadSourceMaps().catch(() => process.exit(1));
