const orig = 'Kết quả đánh giá năng lực đầu vào thạc sĩ.png';
const safeOrig = String(orig).replace(/"/g, '');
let asciiFallback = `file-10`;
try {
  if (typeof safeOrig.normalize === 'function') {
    asciiFallback = safeOrig
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^\x20-\x7E]+/g, '_') // replace non-ASCII with underscore
      .replace(/"/g, '')
      .trim();
  } else {
    asciiFallback = safeOrig.replace(/[^\x20-\x7E]+/g, '_').replace(/"/g, '').trim();
  }
} catch (e) {
  asciiFallback = `file-10`;
}
if (!asciiFallback) asciiFallback = `file-10`;

const encodedName = encodeURIComponent(safeOrig).replace(/['()]/g, escape);
const disposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`;
console.log('disposition:', disposition);
console.log('asciiFallback:', asciiFallback);
console.log('asciiFallback is ASCII?', /^[\x00-\x7F]+$/.test(asciiFallback));
console.log('disposition is ASCII?', /^[\x00-\x7F]+$/.test(disposition));
console.log('encodedName:', encodedName);