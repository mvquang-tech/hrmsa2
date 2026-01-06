const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 1, username: 'admin', role: 'admin', employeeId: 1 }, 'your-secret-key-change-in-production', { expiresIn: '1d' });
console.log(token);