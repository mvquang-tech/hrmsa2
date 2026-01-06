const jwt = require('jsonwebtoken');
const role = process.argv[2] || 'manager';
const empId = parseInt(process.argv[3] || '2', 10);
const payload = { userId: 9999, username: 'testmgr', role, employeeId: empId };
const token = jwt.sign(payload, 'your-secret-key-change-in-production', { expiresIn: '1d' });
console.log(token);