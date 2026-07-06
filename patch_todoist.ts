import fs from 'fs';

const content = fs.readFileSync('src/services/todoistClient.ts', 'utf8');

const updated = content.replace(
  'export const TODOIST_API_BASE = "https://api.todoist.com/rest/v2";',
  'export const TODOIST_API_BASE = "https://api.todoist.com/api/v1";'
);

fs.writeFileSync('src/services/todoistClient.ts', updated);
