const fs = require('fs');

function loadReadme() {
  const path = 'README.md';
  if (!fs.existsSync(path)) throw new Error('README.md not found at project root');
  return fs.readFileSync(path, 'utf8');
}

function extractCodeBlocks(markdown) {
  // returns array of {lang, content}
  const blocks = [];
  const regex = /```([\w+-]*)\n([\s\S]*?)```/g;
  let m;
  while ((m = regex.exec(markdown)) !== null) {
    blocks.push({ lang: (m[1] || '').trim().toLowerCase(), content: m[2] });
  }
  return blocks;
}

function firstCodeBlockByLang(markdown, lang) {
  const blocks = extractCodeBlocks(markdown);
  return blocks.find(b => b.lang === lang.toLowerCase());
}

function getSection(markdown, heading) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, 'm');
  const startMatch = markdown.match(pattern);
  if (!startMatch) return null;
  const startIdx = startMatch.index;
  const rest = markdown.slice(startIdx);
  const nextHeading = rest.search(/^##\s+/m);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { loadReadme, extractCodeBlocks, firstCodeBlockByLang, getSection };