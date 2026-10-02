/**
 * Builds source/js/analytics/init.js into the same IIFE shape vite prepends to lat.js.
 * Runs the esbuild binary out-of-process because the esbuild JS API rejects
 * jsdom's TextEncoder/Uint8Array realm.
 */
const { execFileSync } = require('child_process');
const path = require('path');

let code;

module.exports = function analyticsBundle() {
  if (!code) {
    code = execFileSync(require.resolve('esbuild/bin/esbuild'), [
      path.join(__dirname, '../../source/js/analytics/init.js'),
      '--bundle',
      '--format=iife',
      '--target=es2020',
      '--log-level=error',
    ], { encoding: 'utf8' });
  }
  return code;
};
