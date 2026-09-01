// dsh-live-canvas: 1-Click Instant Web Deploy Engine (Vercel, Cloudflare, Netlify, Gist)

export function buildDeploymentBundle({ session, target = 'vercel', options = {} }) {
  const title = session?.title || 'Live Canvas App';
  const htmlContent = session?.content || '<html><body><h1>Live Canvas App</h1></body></html>';
  const timestamp = new Date().toISOString();

  if (target === 'gist') {
    return {
      target: 'gist',
      filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`,
      content: htmlContent,
      mimeType: 'text/html',
      instructions: 'Paste this content into a new public GitHub Gist and view via https://gistpreview.github.io'
    };
  }

  if (target === 'cloudflare') {
    const routesConfig = JSON.stringify({
      version: 1,
      include: ['/*'],
      exclude: []
    }, null, 2);

    return {
      target: 'cloudflare',
      files: {
        'index.html': htmlContent,
        '_routes.json': routesConfig,
        '_headers': '/*\n  X-Frame-Options: SAMEORIGIN\n  X-Content-Type-Options: nosniff'
      },
      instructions: 'Deploy directly via wrangler: npx wrangler pages deploy ./dist'
    };
  }

  if (target === 'netlify') {
    return {
      target: 'netlify',
      files: {
        'index.html': htmlContent,
        '_redirects': '/*  /index.html  200',
        '_headers': '/*\n  X-Frame-Options: SAMEORIGIN'
      },
      instructions: 'Deploy directly via Netlify CLI: npx netlify deploy --dir=./dist --prod'
    };
  }

  // Default: Vercel
  const vercelConfig = JSON.stringify({
    version: 2,
    name: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    framework: null,
    routes: [
      { handle: 'filesystem' },
      { src: '/(.*)', dest: '/index.html' }
    ]
  }, null, 2);

  return {
    target: 'vercel',
    files: {
      'index.html': htmlContent,
      'vercel.json': vercelConfig,
      'package.json': JSON.stringify({
        name: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        version: '1.0.0',
        scripts: { build: 'echo Build completed' }
      }, null, 2)
    },
    instructions: 'Deploy directly via Vercel CLI: npx vercel --prod'
  };
}

