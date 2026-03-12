#!/usr/bin/env node

/**
 * Scrapes event descriptions from URLs in events.ts
 * Outputs descriptions.json mapping "summary|dtstart" keys to description strings.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVENTS_FILE = join(__dirname, '..', 'src', 'data', 'events.ts');
const OUTPUT_FILE = join(__dirname, 'descriptions.json');

const MAX_CONCURRENT = 1;
const DELAY_MS = 2000; // Luma rate-limits aggressively; keep this slow
const MAX_DESC_LENGTH = 500;
const FETCH_TIMEOUT_MS = 15000;

// ── Parse events from TS file ──────────────────────────────────────

function parseEvents(tsContent) {
  const events = [];
  // Match each event object block
  const eventRegex = /\{[^{}]*?uid:\s*"([^"]*)"[^{}]*?summary:\s*"([^"]*)"[^{}]*?dtstart:\s*"([^"]*)"[^{}]*?url:\s*"([^"]*)"[^{}]*?\}/gs;

  let match;
  while ((match = eventRegex.exec(tsContent)) !== null) {
    const block = match[0];
    const hasDescription = /\bdescription:\s*"/.test(block);
    events.push({
      uid: match[1],
      summary: match[2],
      dtstart: match[3],
      url: match[4],
      hasDescription,
    });
  }
  return events;
}

// ── HTML parsing helpers ───────────────────────────────────────────

function extractMetaContent(html, property) {
  // Try property="..." (OpenGraph)
  const ogRegex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  let m = html.match(ogRegex);
  if (m) return m[1];

  // Try content before property (some pages order attrs differently)
  const reverseRegex = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    'i'
  );
  m = html.match(reverseRegex);
  if (m) return m[1];

  return null;
}

function extractJsonLdDescription(html) {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      // Could be an array or single object
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.description) return item.description;
        // Check @graph
        if (item['@graph'] && Array.isArray(item['@graph'])) {
          for (const g of item['@graph']) {
            if (g.description) return g.description;
          }
        }
      }
    } catch {
      // invalid JSON, skip
    }
  }
  return null;
}

function extractLumaDescription(html) {
  // Luma often puts description in a specific div or in page props
  // Try __NEXT_DATA__ or similar embedded JSON
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      // Navigate the nested structure to find description
      const desc = findNestedDescription(data);
      if (desc) return desc;
    } catch {}
  }

  // Try Luma's data embed patterns
  const lumaDataMatch = html.match(/\"description\"\s*:\s*\"((?:[^"\\]|\\.)*)"/);
  if (lumaDataMatch) {
    try {
      return JSON.parse(`"${lumaDataMatch[1]}"`);
    } catch {
      return lumaDataMatch[1];
    }
  }

  return null;
}

function findNestedDescription(obj, depth = 0) {
  if (depth > 10 || !obj || typeof obj !== 'object') return null;
  if (typeof obj.description === 'string' && obj.description.length > 20) {
    return obj.description;
  }
  for (const key of Object.keys(obj)) {
    const result = findNestedDescription(obj[key], depth + 1);
    if (result) return result;
  }
  return null;
}

function extractDescription(html, url) {
  const hostname = new URL(url).hostname;

  // Strategy varies by domain
  if (hostname.includes('luma.com')) {
    // Try Luma-specific extraction first
    const lumaDesc = extractLumaDescription(html);
    if (lumaDesc && lumaDesc.length > 10) return lumaDesc;
  }

  // Try og:description
  let desc = extractMetaContent(html, 'og:description');
  if (desc && desc.length > 10) return desc;

  // Try meta description
  desc = extractMetaContent(html, 'description');
  if (desc && desc.length > 10) return desc;

  // Try JSON-LD
  desc = extractJsonLdDescription(html);
  if (desc && desc.length > 10) return desc;

  // Try twitter:description
  desc = extractMetaContent(html, 'twitter:description');
  if (desc && desc.length > 10) return desc;

  // For luma, try a broader description pattern as last resort
  if (hostname.includes('luma.com')) {
    const lumaDesc = extractLumaDescription(html);
    if (lumaDesc) return lumaDesc;
  }

  return null;
}

// ── Sanitization ───────────────────────────────────────────────────

function sanitizeDescription(raw) {
  if (!raw) return null;

  let desc = raw;

  // Decode HTML entities
  desc = desc
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ');

  // Strip HTML tags
  desc = desc.replace(/<[^>]+>/g, ' ');

  // Normalize whitespace
  desc = desc.replace(/\s+/g, ' ').trim();

  // Remove markdown-like artifacts
  desc = desc.replace(/\*\*/g, '').replace(/\n/g, ' ');

  // Truncate
  if (desc.length > MAX_DESC_LENGTH) {
    desc = desc.slice(0, MAX_DESC_LENGTH - 3).replace(/\s+\S*$/, '') + '...';
  }

  // Skip if too short to be useful
  if (desc.length < 15) return null;

  return desc;
}

// ── Fetching ───────────────────────────────────────────────────────

async function fetchDescription(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.log(`  HTTP ${response.status} for ${url}`);
      return null;
    }

    const html = await response.text();
    const raw = extractDescription(html, url);
    return sanitizeDescription(raw);
  } catch (err) {
    console.log(`  Error fetching ${url}: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Rate-limited batch processing ──────────────────────────────────

async function processBatch(events, existingDescriptions) {
  const results = { ...existingDescriptions };
  let processed = 0;
  const total = events.length;

  for (let i = 0; i < events.length; i += MAX_CONCURRENT) {
    const batch = events.slice(i, i + MAX_CONCURRENT);
    const promises = batch.map(async (event) => {
      const key = `${event.summary}|${event.dtstart}`;

      // Skip if already scraped
      if (results[key]) {
        processed++;
        return;
      }

      console.log(`[${processed + 1}/${total}] Fetching: ${event.summary.slice(0, 50)}...`);
      const desc = await fetchDescription(event.url);
      if (desc) {
        results[key] = desc;
        console.log(`  ✓ Got description (${desc.length} chars)`);
      } else {
        console.log(`  ✗ No description found`);
      }
      processed++;
    });

    await Promise.all(promises);

    // Save progress after each batch
    writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

    // Rate limit delay
    if (i + MAX_CONCURRENT < events.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  return results;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('Reading events.ts...');
  const tsContent = readFileSync(EVENTS_FILE, 'utf-8');
  const allEvents = parseEvents(tsContent);
  console.log(`Found ${allEvents.length} total events`);

  // Filter to events without descriptions
  const needsDescription = allEvents.filter((e) => !e.hasDescription);
  console.log(`${needsDescription.length} events need descriptions`);

  // Deduplicate by URL (some events share the same URL)
  const uniqueByUrl = new Map();
  for (const e of needsDescription) {
    const key = `${e.summary}|${e.dtstart}`;
    if (!uniqueByUrl.has(key)) {
      uniqueByUrl.set(key, e);
    }
  }
  const eventsToFetch = [...uniqueByUrl.values()];
  console.log(`${eventsToFetch.length} unique events to fetch`);

  // Load existing descriptions (for idempotency)
  let existing = {};
  if (existsSync(OUTPUT_FILE)) {
    try {
      existing = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
      const alreadyDone = Object.keys(existing).length;
      console.log(`Loaded ${alreadyDone} existing descriptions from cache`);
    } catch {
      existing = {};
    }
  }

  // Scrape
  const results = await processBatch(eventsToFetch, existing);

  // Final save
  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  const totalDescriptions = Object.keys(results).length;
  console.log(`\nDone! ${totalDescriptions} descriptions saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
