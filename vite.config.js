import fs from 'fs'; // file system operations for reading js files
import { resolve } from 'path'; // path resolution utilities
import path from 'path'; // path utilities
import { fileURLToPath } from 'url'; // convert file urls to paths
import { globSync } from 'glob'; // file pattern matching
import { defineConfig } from 'vite'; // vite configuration helper
import autoprefixer from 'autoprefixer'; // css vendor prefixing
import cssnano from 'cssnano'; // css minification and optimization
import { compression } from 'vite-plugin-compression2'; // gzip/brotli compression (vite 8 + windows-safe)
import { minify } from 'terser'; // javascript minification

const __dirname = resolve(fileURLToPath(import.meta.url), '..'); // get current directory

export default defineConfig({
  // use default public folder (public/) - assets, html, and vendor files are already there
  // static files in public/ are served directly without copying

  plugins: [ // vite plugins array
    // custom plugin for js concatenation (replaces gulp's concat functionality)
    {
      name: 'js-concat', // plugin name for vite
      buildStart() { // runs at build start
        // add all source files to watch list so vite knows to rebuild when they change
        const allSourceFiles = globSync('source/**/*'); // find all files in source directory

        allSourceFiles.forEach(file => { // iterate through all files
          this.addWatchFile(file); // add each file to vite's watch list
        });
      },
      async generateBundle() { // runs during bundle generation
        // process main js features (equivalent to gulp's scripts task)
        const mainJsContent = getModuleContent('source/js/features'); // get concatenated js content

        // minify the concatenated content
        const minifiedMainJs = await minify(mainJsContent, {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.warn', 'console.error'],
            passes: 3,
            dead_code: true,
            hoist_funs: true,
            hoist_vars: true,
            if_return: true,
            join_vars: true,
            loops: true,
            properties: true,
            reduce_vars: true,
            sequences: true,
            side_effects: false,
            switches: true,
            toplevel: true,
            unsafe: false,
            unsafe_comps: false,
            unsafe_math: false,
            unsafe_proto: false
          },
          mangle: {
            keep_fnames: false,
            toplevel: true,
            properties: {
              regex: /^_/
            }
          },
          format: {
            comments: false,
            beautify: false
          }
        });

        this.emitFile({ // emit the file to output
          type: 'asset', // file type
          fileName: 'js/lat.js', // output filename
          source: minifiedMainJs.code + '\n//# sourceMappingURL=lat.js.map' // sibling .map reference
        });

        // process experimental js (equivalent to gulp's experimental task)
        const experimentalJsContent = getModuleContent('source/experimental/js'); // get experimental js content

        // minify the experimental content
        const minifiedExperimentalJs = await minify(experimentalJsContent, {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.warn', 'console.error'],
            passes: 3,
            dead_code: true,
            hoist_funs: true,
            hoist_vars: true,
            if_return: true,
            join_vars: true,
            loops: true,
            properties: true,
            reduce_vars: true,
            sequences: true,
            side_effects: false,
            switches: true,
            toplevel: true,
            unsafe: false,
            unsafe_comps: false,
            unsafe_math: false,
            unsafe_proto: false
          },
          mangle: {
            keep_fnames: false,
            toplevel: true,
            properties: {
              regex: /^_/
            }
          },
          format: {
            comments: false,
            beautify: false
          }
        });

        this.emitFile({ // emit experimental file
          type: 'asset', // file type
          fileName: 'js/experimental.js', // output filename
          source: minifiedExperimentalJs.code + '\n//# sourceMappingURL=experimental.js.map' // sibling .map reference
        });

        // generate source maps for JS files
        const mainSourceMap = generateSourceMap('source/js/features', 'js/lat.js');
        this.emitFile({
          type: 'asset',
          fileName: 'js/lat.js.map',
          source: JSON.stringify(mainSourceMap)
        });

        const experimentalSourceMap = generateSourceMap('source/experimental/js', 'js/experimental.js');
        this.emitFile({
          type: 'asset',
          fileName: 'js/experimental.js.map',
          source: JSON.stringify(experimentalSourceMap)
        });
      }
    },
    // custom plugin for CSS source maps
    {
      name: 'css-sourcemaps',
      generateBundle(options, bundle) {
        // Find ALL CSS files and create source maps for them
        Object.keys(bundle).forEach(fileName => {
          const chunk = bundle[fileName];
          if (chunk.type === 'asset' && fileName.endsWith('.css')) {
            // Skip vendor CSS files
            if (fileName.includes('vendor/')) {
              return;
            }

            // Determine the source SCSS file based on the CSS file name
            let sourceFile = fileName.replace('css/', 'source/scss/themes/').replace('.css', '.scss');

            // Handle custom theme files
            if (fileName.includes('custom/')) {
              const customPath = fileName.replace('css/custom/', 'source/scss/themes/custom/');
              sourceFile = customPath.replace('.css', '.scss');
            }

            // Handle experimental theme file
            if (fileName === 'css/experimental.css') {
              sourceFile = 'source/experimental/scss/experimental.scss';
            }

            // Generate comprehensive source map with actual source content
            const sourceMap = generateCSSSourceMap(fileName, sourceFile);

            // Emit the source map as a sibling of the CSS file. Browsers resolve
            // sourceMappingURL relative to the CSS file's own location, so placing
            // the map alongside keeps the URL trivially correct at any nesting depth.
            this.emitFile({
              type: 'asset',
              fileName: fileName + '.map',
              source: JSON.stringify(sourceMap)
            });

            // sourceMappingURL is just the basename since the map lives next to the CSS
            const mapBasename = fileName.split('/').pop() + '.map';
            chunk.source += '\n/*# sourceMappingURL=' + mapBasename + ' */';
          }
        });
      }
    },
    // pre-compress static assets (build-only by default; nginx serves with gzip_static)
    // brotli is intentionally omitted: the nginxinc/nginx-unprivileged image lacks the brotli module
    compression({
      algorithms: ['gzip'], // gzip only for now
      threshold: 512, // skip files smaller than 512 bytes
      include: [/\.(css|js)$/], // only css and js
      deleteOriginalAssets: false, // keep originals so plain clients still get served
      skipIfLargerOrEqual: true // skip if compressed size >= original (equivalent to old minRatio guard)
    })
  ],

  // css processing (replaces gulp's sass, autoprefixer, cleancss tasks)
  css: { // css configuration
    devSourcemap: true, // enable CSS source maps
    preprocessorOptions: { // preprocessor options
      scss: { // scss specific options
        // scss options - add includepaths for proper imports
        includePaths: ['source/scss'], // paths to search for scss imports
        // allow all warnings to show
        quietDeps: false, // show dependency warnings
        // source maps enabled for debugging
        sourceMap: true, // enable source maps for debugging
        // optimize scss compilation
        precision: 6, // decimal precision for calculations
        // enable modern scss features
        api: 'modern-compiler' // use modern scss compiler
      }
    },
    postcss: { // postcss configuration
      plugins: [ // postcss plugins array
        autoprefixer({ // autoprefixer plugin
          cascade: false, // disable cascade for cleaner output
          // optimize autoprefixer for better browser support
          overrideBrowserslist: ['> 1%', 'last 2 versions', 'not dead'] // browser support targets
        }),
        cssnano({ // cssnano minification plugin
          preset: ['default', { // use default preset with custom options
            // maximum css optimization for production
            discardComments: { removeAll: true }, // remove all comments
            normalizeWhitespace: true, // normalize whitespace
            minifyFontValues: true, // minify font declarations
            minifySelectors: true, // minify selectors
            mergeLonghand: true, // merge shorthand properties
            mergeRules: true, // merge duplicate rules
            // additional aggressive optimizations
            discardEmpty: true, // remove empty rules
            discardDuplicates: true, // remove duplicate rules
            discardOverridden: true, // remove overridden rules
            discardUnused: false, // keep unused rules for potential dynamic use
            mergeIdents: true, // merge identical selectors
            reduceIdents: true, // reduce identifier length
            zindex: false // keep z-index values as-is for safety
          }]
        })
      ]
    }
  },

  // build configuration
  build: { // build options
    outDir: 'dist', // output directory
    // disable esbuild css minification to avoid warnings with css hacks
    cssMinify: false, // disable esbuild css minification
    // optimize build performance
    target: 'es2015', // javascript target version
    // enable chunk splitting for better caching
    chunkSizeWarningLimit: 1000, // chunk size warning threshold
    rolldownOptions: { // rolldown bundler options (vite 8)
      input: { // entry points
        // scss entry points for themes (replaces gulp's sasssources)
        ...getScssEntries() // spread scss entries from helper function
      },
      output: { // output configuration
        // preserve directory structure for css
        assetFileNames: (assetInfo) => { // custom asset file naming
          if (assetInfo.names?.[0]?.endsWith('.css')) { // if file is css
            return 'css/[name][extname]'; // output to css directory
          }
          // don't copy fontawesome fonts to assets - they stay in public/
          if (assetInfo.names?.[0]?.includes('fontawesome')) { // if file is fontawesome
            return 'css/vendor/font-awesome-4.7.0/fonts/[name][extname]'; // output to fontawesome fonts directory
          }
          return 'assets/[name][extname]'; // default to assets directory
        },
      }
    },
    // source maps enabled for debugging
    sourcemap: true, // enable source maps
    // minification (replaces gulp's uglify)
    minify: 'terser', // use terser for minification
    terserOptions: { // terser minification options
      compress: { // compression options
        drop_console: true, // remove console statements
        drop_debugger: true, // remove debugger statements
        // maximum javascript optimization
        pure_funcs: ['console.log', 'console.info', 'console.warn', 'console.error'], // remove pure function calls
        passes: 3, // number of optimization passes
        // additional aggressive optimizations
        dead_code: true, // remove dead code
        hoist_funs: true, // hoist function declarations
        hoist_vars: true, // hoist variable declarations
        if_return: true, // optimize if-return patterns
        join_vars: true, // join variable declarations
        loops: true, // optimize loops
        properties: true, // optimize property access
        reduce_vars: true, // reduce variable usage
        sequences: true, // optimize sequences
        side_effects: false, // assume no side effects
        switches: true, // optimize switch statements
        toplevel: true, // optimize top-level code
        unsafe: false, // keep safe for compatibility
        unsafe_comps: false, // keep safe comparisons
        unsafe_math: false, // keep safe math operations
        unsafe_proto: false // keep safe prototype access
      },
      mangle: { // name mangling options
        // maximum name mangling for smaller files
        keep_fnames: false, // mangle function names
        toplevel: true, // mangle top-level names
        properties: { // property mangling
          regex: /^_/ // mangle properties starting with underscore
        }
      },
      format: { // output formatting
        // remove all formatting
        comments: false, // remove comments
        beautify: false // no beautification
      }
    }
  },

  // public directory configuration - vite automatically copies public/ to dist/ root

  // development server (replaces browsersync)
  server: { // development server options
    port: 9000, // server port
    host: true, // allow external connections
    // enable hmr for scss and js files
    hmr: true // hot module replacement
  },

  // resolve configuration
  resolve: { // module resolution
    alias: { // path aliases
      '@': resolve(__dirname, 'source'), // alias for source directory
      '@scss': resolve(__dirname, 'source/scss'), // alias for scss directory
      '@js': resolve(__dirname, 'source/js') // alias for js directory
    }
  },

  // define global constants
  define: { // global variable definitions
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development') // development flag
  }
});

// helper function to get scss entries (replaces gulp's sasssources config)
function getScssEntries() { // function to get scss entry points
  // only include the main theme files that should be built as separate css files
  const themeFiles = [ // array of theme file paths
    'source/scss/themes/bcit.scss', // main bcit theme
    'source/scss/themes/business.scss', // business theme
    'source/scss/themes/energy.scss', // energy theme
    'source/scss/themes/health.scss', // health theme
    // custom theme files
    'source/scss/themes/custom/business/business-administration.scss', // business administration theme
    'source/scss/themes/custom/business/retail-marketing-management.scss', // retail marketing theme
    'source/scss/themes/custom/health/bachelor-science-nursing.scss', // nursing theme
    'source/scss/themes/custom/health/specialty-nursing-perinatal.scss', // perinatal theme
    'source/scss/themes/custom/computing/computing.scss', // computing theme
    'source/scss/themes/custom/construction/construction.scss', // construction theme
    // 'source/scss/themes/custom/energy/energy.scss', // commented out duplicate energy theme
    'source/scss/themes/custom/transportation/transportation.scss', // transportation theme
    // experimental theme
    'source/experimental/scss/experimental.scss' // experimental theme
  ];

  const entries = {}; // object to store entry points

  themeFiles.forEach(file => { // iterate through theme files
    // create proper entry names that match the original structure
    let name = file.replace('source/scss/', '').replace('source/experimental/scss/', '').replace('.scss', ''); // clean up file path

    // handle custom themes path structure
    if (name.includes('custom/')) { // if custom theme
      name = name.replace('themes/custom/', 'custom/'); // replace themes/custom with custom
    } else if (name.startsWith('themes/')) { // if main theme
      name = name.replace('themes/', ''); // remove themes prefix
    }

    entries[name] = resolve(__dirname, file); // add entry point
  });

  return entries; // return entries object
}

// helper function to get module content for js concatenation
function getModuleContent(sourceDir) { // function to concatenate js files
  const jsFiles = globSync(`${sourceDir}/*.js`, { // find all js files in directory
    ignore: [`${sourceDir}/-WIP-*.js`] // ignore work-in-progress files
  });

  let content = ''; // initialize content string

  // add jquery first if this is the main features bundle
  if (sourceDir === 'source/js/features') { // if main features directory
    content += '// jQuery\n'; // add jquery comment
    content += fs.readFileSync('public/js/vendor/jquery-4.0.0.min.js', 'utf8'); // read jquery file
    content += '\n\n'; // add newlines
  }

  jsFiles.forEach(file => { // iterate through js files
    content += `// ${file}\n`; // add file comment
    content += fs.readFileSync(file, 'utf8'); // read file content
    content += '\n\n'; // add newlines
  });

  return content; // return concatenated content
}

// helper function to generate source maps for concatenated JS
function generateSourceMap(sourceDir, outputFile) {
  const jsFiles = globSync(`${sourceDir}/*.js`, { // find all js files in directory
    ignore: [`${sourceDir}/-WIP-*.js`] // ignore work-in-progress files
  });

  const sources = []; // initialize sources array
  const sourcesContent = []; // initialize sources content array

  // add jquery source if this is the main features bundle
  if (sourceDir === 'source/js/features') { // if main features directory
    sources.push('public/js/vendor/jquery-4.0.0.min.js'); // add jquery source
    sourcesContent.push(fs.readFileSync('public/js/vendor/jquery-4.0.0.min.js', 'utf8')); // add jquery content
  }

  jsFiles.forEach(file => { // iterate through js files
    sources.push(file.replace(/\\/g, '/')); // normalize paths for source map
    sourcesContent.push(fs.readFileSync(file, 'utf8')); // read source file contents
  });

  return {
    version: 3,
    file: outputFile,
    sources: sources,
    names: [],
    mappings: 'AAAA', // basic mapping - could be enhanced with proper source map generation
    sourcesContent: sourcesContent
  };
}

// helper function to generate source maps for CSS files
function generateCSSSourceMap(cssFile, scssFile) {
  let sources = [];
  let sourcesContent = [];
  let processedFiles = new Set(); // prevent duplicate processing

  function processScssFile(filePath) {
    if (processedFiles.has(filePath) || !fs.existsSync(filePath)) {
      return;
    }

    processedFiles.add(filePath);
    const scssContent = fs.readFileSync(filePath, 'utf8');
    // Convert absolute path to relative path from the map file location
    const mapDir = path.dirname(cssFile);
    const relativePath = path.relative(mapDir, filePath).replace(/\\/g, '/');
    sources.push(relativePath);
    sourcesContent.push(scssContent);

    // Find and include all @use/@import statements
    const importRegex = /@(?:use|import)\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(scssContent)) !== null) {
      const importPath = match[1];
      let fullPath;

      // Handle different import path formats
      if (importPath.startsWith('../')) {
        fullPath = path.resolve(path.dirname(filePath), importPath);
      } else if (importPath.startsWith('./')) {
        fullPath = path.resolve(path.dirname(filePath), importPath);
      } else {
        // Assume it's relative to the source/scss directory
        fullPath = path.resolve('source/scss', importPath);
      }

      // Normalize the path
      fullPath = path.normalize(fullPath);

      // Add .scss extension if not present
      if (!fullPath.endsWith('.scss') && !fullPath.endsWith('.css')) {
        fullPath += '.scss';
      }

      // Try with underscore prefix (SCSS partials)
      if (!fs.existsSync(fullPath)) {
        const dir = path.dirname(fullPath);
        const base = path.basename(fullPath, '.scss');
        const underscoredPath = path.join(dir, '_' + base + '.scss');
        if (fs.existsSync(underscoredPath)) {
          fullPath = underscoredPath;
        }
      }

      // Recursively process imported files
      processScssFile(fullPath);
    }
  }

  // Start processing from the main SCSS file
  processScssFile(scssFile);

  return {
    version: 3,
    sources: sources,
    names: [],
    mappings: 'AAAA', // basic mapping
    file: cssFile,
    sourcesContent: sourcesContent
  };
}