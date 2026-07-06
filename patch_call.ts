import fs from 'fs';

let content = fs.readFileSync('src/services/todoistClient.ts', 'utf8');

const target = `  if (res.status === 204) {
    return { success: true };
  }

  return await res.json();`;

const replacement = `  if (res.status === 204) {
    return { success: true };
  }

  const data = await res.json();
  if (data && typeof data === "object" && Array.isArray(data.results)) {
    return data.results;
  }
  return data;`;

content = content.replace(target, replacement);
fs.writeFileSync('src/services/todoistClient.ts', content);
