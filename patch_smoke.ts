import fs from 'fs';

let content = fs.readFileSync('src/services/todoistClient.ts', 'utf8');

const targetIf = `export interface SmokeTestResult {`;

const targetReplacement = `export interface SmokeTestResult {
  testedMethods: {
    name: string;
    url?: string;
    status: string;
    ok: boolean;
    rawResponse: string;
  }[];
  selectedProvider: "sdk" | "sync" | "rest" | "none";
  reason: string;`;

content = content.replace(targetIf, targetReplacement);
fs.writeFileSync('src/services/todoistClient.ts', content);
