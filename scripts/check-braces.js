const fs = require('fs');
const path = process.argv[2] || 'app/overtime/page.tsx';
const s = fs.readFileSync(path, 'utf8');
const counts = { '{': 0, '}': 0, '(': 0, ')': 0, '[': 0, ']': 0 };
for (const ch of s) if (counts.hasOwnProperty(ch)) counts[ch]++;
console.log('counts:', counts);
// Find last 200 chars around the first unexpected closing brace if any
const stack = [];
const pairs = { '{': '}', '(': ')', '[': ']' };
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (ch === '{' || ch === '(' || ch === '[') stack.push({ ch, i });
  else if (ch === '}' || ch === ')' || ch === ']') {
    const last = stack.pop();
    if (!last) {
      console.log('Unmatched closing', ch, 'at', i);
      console.log('context:', s.slice(Math.max(0, i - 80), i + 80));
      process.exit(0);
    }
    const expect = pairs[last.ch];
    if (expect !== ch) {
      console.log('Mismatched at', i, 'expected', expect, 'got', ch);
      console.log('open at', last.i, 'context:', s.slice(Math.max(0, last.i - 80), last.i + 80));
      process.exit(0);
    }
  }
}
if (stack.length) {
  const last = stack[stack.length-1];
  console.log('Unclosed opening', last.ch, 'at', last.i);
  console.log('context:', s.slice(Math.max(0, last.i - 80), last.i + 80));
} else console.log('All braces matched');
