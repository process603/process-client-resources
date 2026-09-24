import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'map.html', 'styles.css', 'map.css', 'app.js', 'map.js', 'config.js', 'resources.json', 'process-logo.png', 'king-logo.png']) {
  await cp(`src/${file}`, `dist/${file}`);
}

await mkdir('docs', { recursive: true });
await cp('dist', 'docs', { recursive: true });
await (await import('node:fs/promises')).writeFile('docs/.nojekyll', '');
