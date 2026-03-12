#!/usr/bin/env node

/**
 * Reads descriptions.json and inserts description fields into events.ts
 * for events that don't already have one.
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVENTS_FILE = join(__dirname, '..', 'src', 'data', 'events.ts');
const DESCRIPTIONS_FILE = join(__dirname, 'descriptions.json');

function escapeForTS(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function main() {
  console.log('Reading descriptions.json...');
  const descriptions = JSON.parse(readFileSync(DESCRIPTIONS_FILE, 'utf-8'));
  const descCount = Object.keys(descriptions).length;
  console.log(`Loaded ${descCount} descriptions`);

  console.log('Reading events.ts...');
  let tsContent = readFileSync(EVENTS_FILE, 'utf-8');

  let applied = 0;
  let skipped = 0;

  // Process each event block that doesn't have a description.
  // We find blocks by matching the pattern: summary line followed by dtstart line
  // with no description line in between.
  //
  // Strategy: find each event object `{ ... }` and check if it needs a description.

  // Split into event blocks by matching opening braces at the right indentation
  // We'll use a regex to find each event object and process it

  const lines = tsContent.split('\n');
  const newLines = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect start of an event object (line with just "  {")
    if (/^\s{2}\{$/.test(line)) {
      // Collect the entire event block
      const blockStart = i;
      const blockLines = [line];
      i++;
      let braceDepth = 1;

      while (i < lines.length && braceDepth > 0) {
        const l = lines[i];
        blockLines.push(l);
        // Count braces (not inside strings, but rough count is fine for this structure)
        for (const ch of l) {
          if (ch === '{') braceDepth++;
          if (ch === '}') braceDepth--;
        }
        i++;
      }

      const blockText = blockLines.join('\n');

      // Check if this block already has a description field
      const hasDesc = /\bdescription:\s*"/.test(blockText);

      if (!hasDesc) {
        // Extract summary and dtstart
        const summaryMatch = blockText.match(/summary:\s*"([^"]*)"/);
        const dtstartMatch = blockText.match(/dtstart:\s*"([^"]*)"/);

        if (summaryMatch && dtstartMatch) {
          const key = `${summaryMatch[1]}|${dtstartMatch[1]}`;
          const desc = descriptions[key];

          if (desc) {
            // Insert description after the summary line
            const escapedDesc = escapeForTS(desc);
            const newBlockLines = [];
            let inserted = false;

            for (const bl of blockLines) {
              newBlockLines.push(bl);
              if (!inserted && /^\s+summary:\s*"/.test(bl)) {
                // Add description on the next line with same indentation
                const indent = bl.match(/^(\s+)/)?.[1] || '    ';
                newBlockLines.push(`${indent}description: "${escapedDesc}",`);
                inserted = true;
              }
            }

            newLines.push(...newBlockLines);
            applied++;
            continue;
          }
        }
        skipped++;
      }

      newLines.push(...blockLines);
      continue;
    }

    newLines.push(line);
    i++;
  }

  const newContent = newLines.join('\n');
  writeFileSync(EVENTS_FILE, newContent);

  console.log(`Applied ${applied} descriptions`);
  console.log(`Skipped ${skipped} events (no description available)`);
  console.log('Done!');
}

main();
