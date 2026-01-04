const fs = require('fs');
const s = fs.readFileSync('app/overtime/page.tsx','utf8');
const search = 'return (';
const idx = s.indexOf(search);
console.log('idx', idx);
if (idx === -1) { console.log('not found'); process.exit(0); }
console.log('context:', JSON.stringify(s.slice(idx-80, idx+80)));
for (let i = Math.max(0, idx-10); i < Math.min(s.length, idx+20); i++) {
  const ch = s[i];
  console.log(i, JSON.stringify(ch), ch.charCodeAt(0));
}
