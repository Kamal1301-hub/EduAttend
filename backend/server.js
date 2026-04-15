const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => { console.log(`${req.method} ${req.path}`); next(); });
}

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/institutes', require('./routes/institutes'));
app.use('/api/batches',    require('./routes/batches'));
app.use('/api/students',   require('./routes/students'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/messages',   require('./routes/messages'));
app.use('/api/tests',      require('./routes/tests'));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'EduAttend API running', timestamp: new Date() }));

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.path} not found` }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ success: false, message: 'Server error' }); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`\n🚀 EduAttend API → http://localhost:${PORT}\n`));
