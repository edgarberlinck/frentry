/**
 * Frentry Webpack Plugin
 * 
 * Automatically uploads source maps after build.
 * 
 * Usage:
 * 
 * const FrentrySourceMapPlugin = require('./scripts/frentry-webpack-plugin');
 * 
 * module.exports = {
 *   plugins: [
 *     new FrentrySourceMapPlugin({
 *       projectId: process.env.FRENTRY_PROJECT_ID,
 *       version: process.env.FRENTRY_VERSION || 'dev',
 *       apiUrl: process.env.FRENTRY_API_URL || 'http://localhost:3000',
 *       enabled: process.env.NODE_ENV === 'production',
 *     })
 *   ]
 * }
 */

const https = require('https');
const http = require('http');

class FrentrySourceMapPlugin {
  constructor(options = {}) {
    this.options = {
      projectId: options.projectId,
      version: options.version,
      apiUrl: options.apiUrl || 'http://localhost:3000',
      authToken: options.authToken,
      enabled: options.enabled !== false,
      deleteAfterUpload: options.deleteAfterUpload === true,
    };

    if (!this.options.projectId || !this.options.version) {
      console.warn('[Frentry] projectId and version are required. Source maps will not be uploaded.');
      this.options.enabled = false;
    }
  }

  apply(compiler) {
    if (!this.options.enabled) {
      return;
    }

    compiler.hooks.afterEmit.tapPromise('FrentrySourceMapPlugin', async (compilation) => {
      const sourceMaps = [];

      for (const [fileName, asset] of Object.entries(compilation.assets)) {
        if (fileName.endsWith('.js.map')) {
          const content = asset.source();
          const jsFileName = fileName.replace('.map', '');
          
          sourceMaps.push({
            fileName: jsFileName,
            content: typeof content === 'string' ? content : content.toString(),
          });
        }
      }

      if (sourceMaps.length === 0) {
        console.log('[Frentry] No source maps found to upload');
        return;
      }

      console.log(`[Frentry] Uploading ${sourceMaps.length} source map(s)...`);

      try {
        await this.uploadSourceMaps(sourceMaps);
        console.log('[Frentry] ✅ Source maps uploaded successfully');

        if (this.options.deleteAfterUpload) {
          for (const fileName of Object.keys(compilation.assets)) {
            if (fileName.endsWith('.js.map')) {
              delete compilation.assets[fileName];
            }
          }
          console.log('[Frentry] Source maps removed from output');
        }
      } catch (error) {
        console.error('[Frentry] ❌ Failed to upload source maps:', error.message);
        throw error;
      }
    });
  }

  uploadSourceMaps(sourceMaps) {
    const payload = {
      version: this.options.version,
      sourceMaps,
    };

    const url = new URL(`/api/projects/${this.options.projectId}/releases`, this.options.apiUrl);
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

    if (this.options.authToken) {
      options.headers['Authorization'] = `Bearer ${this.options.authToken}`;
    }

    return new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(payload));
      req.end();
    });
  }
}

module.exports = FrentrySourceMapPlugin;
