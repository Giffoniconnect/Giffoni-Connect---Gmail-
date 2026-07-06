import fs from 'fs';

let content = fs.readFileSync('src/services/todoistClient.ts', 'utf8');
content = content.replace(
  'import { TodoistApi } from "@doist/todoist-api-typescript";',
  'import { TodoistApi } from "@doist/todoist-api-typescript";\n// Note: the v7 TodoistApi client maps filter correctly, and we intercept it when bypassing.\n'
);
fs.writeFileSync('src/services/todoistClient.ts', content);
