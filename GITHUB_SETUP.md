# Publish the resource hub

1. Create process603/process-client-resources as a public repository.
2. Upload the contents of this folder, preserving the docs folder.
3. In Settings > Pages choose Deploy from a branch, main, /docs, then Save.

The live Apps Script feed is configured in src/config.js. Staff edit the work-owned Sheet. The feed includes active public resource fields and excludes Staff Notes. The packaged snapshot is used if the live feed cannot load.

For future code edits: run npm test and npm run build, then copy dist contents to docs before committing.
