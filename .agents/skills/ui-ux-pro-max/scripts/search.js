#!/usr/bin/env node
/**
 * UI/UX Pro Max Search (Node.js companion)
 * Usage:
 *   node search.js "<query>" [--domain <domain>] [--stack <stack>] [--max-results 3] [--json]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const STACKS_DIR = path.join(DATA_DIR, 'stacks');

const CSV_CONFIG = {
  style: {
    file: 'styles.csv',
    search_cols: ['Style ID', 'Style Category', 'Aliases', 'Keywords', 'Best For', 'Type', 'AI Prompt Keywords'],
  },
  color: {
    file: 'colors.csv',
    search_cols: ['Product Type', 'Notes', 'Primary', 'Secondary', 'Accent'],
  },
  chart: {
    file: 'charts.csv',
    search_cols: ['Data Type', 'Keywords', 'Best Chart Type', 'When to Use', 'Accessibility Notes'],
  },
  landing: {
    file: 'landing.csv',
    search_cols: ['Pattern ID', 'Pattern Name', 'Aliases', 'Keywords', 'Conversion Optimization'],
  },
  product: {
    file: 'products.csv',
    search_cols: ['Product Type', 'Keywords', 'Primary Style Recommendation', 'Key Considerations'],
  },
  ux: {
    file: 'ux-guidelines.csv',
    search_cols: ['Category', 'Issue', 'Description', 'Platform', 'Do', 'Don\'t'],
  },
  typography: {
    file: 'typography.csv',
    search_cols: ['Font Pairing Name', 'Category', 'Mood/Style Keywords', 'Best For', 'Heading Font', 'Body Font'],
  },
  icons: {
    file: 'icons.csv',
    search_cols: ['Category', 'Icon Name', 'Keywords', 'Best For', 'Library'],
  },
  gsap: {
    file: 'motion.csv',
    search_cols: ['Category', 'Intensity Tier', 'Keywords', 'Trigger'],
  },
  react: {
    file: 'react-performance.csv',
    search_cols: ['Category', 'Issue', 'Keywords', 'Description'],
  },
  web: {
    file: 'app-interface.csv',
    search_cols: ['Category', 'Issue', 'Keywords', 'Description'],
  },
};

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 0 && currentRow.some(f => f.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] !== undefined ? row[idx].trim() : '';
    });
    return obj;
  });
}

function scoreRow(row, queryTokens, searchCols) {
  let score = 0;
  const colsToSearch = searchCols && searchCols.length > 0 ? searchCols : Object.keys(row);

  for (const col of colsToSearch) {
    const val = (row[col] || '').toLowerCase();
    if (!val) continue;

    for (const token of queryTokens) {
      if (val.includes(token)) {
        score += token.length;
        // Exact word match bonus
        const regex = new RegExp(`\\b${token}\\b`, 'i');
        if (regex.test(val)) {
          score += 5;
        }
      }
    }
  }
  return score;
}

function search(query, domain, stack, maxResults = 3) {
  const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  let filePath = '';
  let searchCols = [];
  let domainName = domain || 'auto';

  if (stack) {
    filePath = path.join(STACKS_DIR, `${stack}.csv`);
    if (!fs.existsSync(filePath)) {
      return { error: `Stack '${stack}' not found in ${STACKS_DIR}` };
    }
  } else if (domain && CSV_CONFIG[domain]) {
    filePath = path.join(DATA_DIR, CSV_CONFIG[domain].file);
    searchCols = CSV_CONFIG[domain].search_cols;
  } else {
    // Default to styles.csv
    filePath = path.join(DATA_DIR, 'styles.csv');
    searchCols = CSV_CONFIG.style.search_cols;
    domainName = 'style';
  }

  if (!fs.existsSync(filePath)) {
    return { error: `File not found: ${filePath}` };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const rows = parseCSV(raw);

  const scored = rows.map(row => ({
    row,
    score: scoreRow(row, queryTokens, searchCols),
  })).filter(item => item.score > 0);

  scored.sort((a, b) => b.score - a.score);

  const results = scored.slice(0, maxResults).map(item => item.row);

  return {
    query,
    domain: domainName,
    stack: stack || null,
    file: path.basename(filePath),
    count: results.length,
    results,
  };
}

function main() {
  const args = process.argv.slice(2);
  let query = '';
  let domain = null;
  let stack = null;
  let maxResults = 3;
  let isJson = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--domain' || arg === '-d') {
      domain = args[++i];
    } else if (arg === '--stack' || arg === '-s') {
      stack = args[++i];
    } else if (arg === '--max-results' || arg === '-n') {
      maxResults = parseInt(args[++i], 10) || 3;
    } else if (arg === '--json') {
      isJson = true;
    } else if (!arg.startsWith('-') && !query) {
      query = arg;
    }
  }

  if (!query) {
    console.error('Usage: node search.js "<query>" [--domain <domain>] [--stack <stack>] [--max-results 3] [--json]');
    process.exit(1);
  }

  const result = search(query, domain, stack, maxResults);

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.error) {
    console.error('Error:', result.error);
    process.exit(1);
  }

  console.log(`## UI Pro Max Search Results`);
  console.log(`**Domain:** ${result.domain} | **Query:** ${result.query}`);
  if (result.stack) console.log(`**Stack:** ${result.stack}`);
  console.log(`**Source:** ${result.file} | **Found:** ${result.count} results\n`);

  if (result.count === 0) {
    console.log('No matches found for query in database.');
    return;
  }

  result.results.forEach((row, idx) => {
    console.log(`### Result ${idx + 1}`);
    for (const [key, val] of Object.entries(row)) {
      if (val) {
        console.log(`- **${key}:** ${val}`);
      }
    }
    console.log('');
  });
}

main();
