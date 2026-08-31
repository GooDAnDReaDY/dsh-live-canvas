import zlib from 'node:zlib';

export function createZipBuffer(files = []) {
  const localHeaders = [];
  const centralHeaders = [];
  let currentOffset = 0;

  for (const file of files) {
    const fileNameBuf = Buffer.from(file.path.replace(/\\/g, '/'), 'utf8');
    const contentBuf = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content || '', 'utf8');
    const uncompressedSize = contentBuf.length;
    const crc = zlib.crc32(contentBuf);
    const compressedData = zlib.deflateRawSync(contentBuf);
    const compressedSize = compressedData.length;

    // 1. Local File Header (30 bytes + name length + data length)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(20, 4); // version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // general purpose flag (UTF-8)
    localHeader.writeUInt16LE(8, 8); // compression method (deflate)
    localHeader.writeUInt16LE(0, 10); // file last mod time
    localHeader.writeUInt16LE(0, 12); // file last mod date
    localHeader.writeUInt32LE(crc, 14); // crc-32
    localHeader.writeUInt32LE(compressedSize, 18); // compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // uncompressed size
    localHeader.writeUInt16LE(fileNameBuf.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length

    const localRecord = Buffer.concat([localHeader, fileNameBuf, compressedData]);
    localHeaders.push(localRecord);

    // 2. Central Directory Header (46 bytes + name length)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // central file header signature
    centralHeader.writeUInt16LE(0x0314, 4); // version made by (UNIX 2.0)
    centralHeader.writeUInt16LE(20, 6); // version needed to extract (2.0)
    centralHeader.writeUInt16LE(0x0800, 8); // general purpose flag (UTF-8)
    centralHeader.writeUInt16LE(8, 10); // compression method (deflate)
    centralHeader.writeUInt16LE(0, 12); // file last mod time
    centralHeader.writeUInt16LE(0, 14); // file last mod date
    centralHeader.writeUInt32LE(crc, 16); // crc-32
    centralHeader.writeUInt32LE(compressedSize, 20); // compressed size
    centralHeader.writeUInt32LE(uncompressedSize, 24); // uncompressed size
    centralHeader.writeUInt16LE(fileNameBuf.length, 28); // file name length
    centralHeader.writeUInt16LE(0, 30); // extra field length
    centralHeader.writeUInt16LE(0, 32); // file comment length
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal file attributes
    centralHeader.writeUInt32LE(0x81a40000, 38); // external file attributes (regular file 0644)
    centralHeader.writeUInt32LE(currentOffset, 42); // relative offset of local header

    const centralRecord = Buffer.concat([centralHeader, fileNameBuf]);
    centralHeaders.push(centralRecord);

    currentOffset += localRecord.length;
  }

  const centralDirectoryOffset = currentOffset;
  const centralDirectoryBuf = Buffer.concat(centralHeaders);
  const centralDirectorySize = centralDirectoryBuf.length;

  // 3. End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // end of central dir signature
  eocd.writeUInt16LE(0, 4); // number of this disk
  eocd.writeUInt16LE(0, 6); // number of the disk with the start of central dir
  eocd.writeUInt16LE(files.length, 8); // total entries in central dir on this disk
  eocd.writeUInt16LE(files.length, 10); // total entries in central dir
  eocd.writeUInt32LE(centralDirectorySize, 12); // size of central dir
  eocd.writeUInt32LE(centralDirectoryOffset, 16); // offset of start of central dir
  eocd.writeUInt16LE(0, 20); // zip comment length

  return Buffer.concat([...localHeaders, centralDirectoryBuf, eocd]);
}

export function buildProjectFiles(session, options = {}) {
  const framework = options.framework || 'vite-react';
  const title = session.title || 'Live Component';
  const pkgName = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'live-project';
  const rawContent = session.content || '<div class="p-6">Hello World</div>';

  if (framework === 'vite-vue') {
    return [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: pkgName,
          private: true,
          version: '0.0.0',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview'
          },
          dependencies: {
            vue: '^3.4.0',
            'lucide-vue-next': '^0.350.0'
          },
          devDependencies: {
            '@vitejs/plugin-vue': '^5.0.0',
            autoprefixer: '^10.4.18',
            postcss: '^8.4.35',
            tailwindcss: '^3.4.1',
            vite: '^5.1.0'
          }
        }, null, 2)
      },
      {
        path: 'vite.config.js',
        content: `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: { port: 3000, open: true }
});
`
      },
      {
        path: 'tailwind.config.js',
        content: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: []
};
`
      },
      {
        path: 'postcss.config.js',
        content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
`
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body class="bg-zinc-950 text-zinc-100 min-h-screen">
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`
      },
      {
        path: 'src/style.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`
      },
      {
        path: 'src/main.js',
        content: `import { createApp } from 'vue';
import './style.css';
import App from './App.vue';

createApp(App).mount('#app');
`
      },
      {
        path: 'src/App.vue',
        content: `<template>
  <div class="min-h-screen p-8">
    ${rawContent}
  </div>
</template>

<script setup>
// Component logic
</script>
`
      },
      {
        path: 'README.md',
        content: `# ${title}

Packaged from **DeepSeek Harness Live Canvas**.

## Quick Start
\`\`\`bash
npm install
npm run dev
\`\`\`
`
      }
    ];
  }

  // Default: vite-react
  return [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: pkgName,
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        },
        dependencies: {
          clsx: '^2.1.0',
          'lucide-react': '^0.350.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          'tailwind-merge': '^2.2.1'
        },
        devDependencies: {
          '@types/react': '^18.2.56',
          '@types/react-dom': '^18.2.19',
          '@vitejs/plugin-react': '^4.2.1',
          autoprefixer: '^10.4.18',
          postcss: '^8.4.35',
          tailwindcss: '^3.4.1',
          vite: '^5.1.0'
        }
      }, null, 2)
    },
    {
      path: 'vite.config.js',
      content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, open: true }
});
`
    },
    {
      path: 'tailwind.config.js',
      content: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: []
};
`
    },
    {
      path: 'postcss.config.js',
      content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
`
    },
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body class="bg-zinc-950 text-zinc-100 min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`
    },
    {
      path: 'src/index.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`
    },
    {
      path: 'src/main.jsx',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
    },
    {
      path: 'src/App.jsx',
      content: session.componentType === 'react' ?
        (rawContent.includes('export default') ? rawContent : `export default function App() {\n  return (\n    <div className="min-h-screen p-8">\n      ${rawContent}\n    </div>\n  );\n}\n`) :
        `export default function App() {\n  return (\n    <div className="min-h-screen p-8">\n      ${rawContent}\n    </div>\n  );\n}\n`
    },
    {
      path: 'README.md',
      content: `# ${title}

Packaged from **DeepSeek Harness Live Canvas**.

## Quick Start
\`\`\`bash
npm install
npm run dev
\`\`\`

## Build for Production
\`\`\`bash
npm run build
\`\`\`
`
    }
  ];
}

export function buildProjectZip(session, options = {}) {
  const files = buildProjectFiles(session, options);
  return createZipBuffer(files);
}

