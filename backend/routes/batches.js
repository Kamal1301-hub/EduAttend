const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { instituteOnly } = require('../middleware/auth');

// All batch routes require institute login
// institute ID comes from JWT token (req.user.id)

// GET /api/batches
router.get('/', instituteOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, COUNT(s.id) as student_count 
       FROM batches b LEFT JOIN students s ON s.batch_id = b.id
       WHERE b.institute_id = ? GROUP BY b.id ORDER BY b.created_at ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/batches
router.post('/', instituteOnly, async (req, res) => {
  try {
    const { name, classLevel, board, stream, timing } = req.body;
    if (!name || !classLevel) return res.status(400).json({ success: false, message: 'Batch name and class are required' });
    const finalStream = (classLevel === '11' || classLevel === '12') ? (stream || 'Board') : '';
    const [result] = await db.query(
      'INSERT INTO batches (institute_id, name, class, board, stream, timing) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, name, classLevel, board || 'CBSE', finalStream, timing || '']
    );
    res.status(201).json({ success: true, message: 'Batch created', data: { id: result.insertId, name, class: classLevel, board: board || 'CBSE', stream: finalStream, timing: timing || '' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/batches/:id
router.put('/:id', instituteOnly, async (req, res) => {
  try {
    const { name, classLevel, board, stream, timing } = req.body;
    const [existing] = await db.query('SELECT * FROM batches WHERE id = ? AND institute_id = ?', [req.params.id, req.user.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Batch not found' });
    const cls = classLevel || existing[0].class;
    const finalStream = (cls === '11' || cls === '12') ? (stream || existing[0].stream) : '';
    await db.query(
      'UPDATE batches SET name=?, class=?, board=?, stream=?, timing=?, updated_at=NOW() WHERE id=? AND institute_id=?',
      [name || existing[0].name, cls, board || existing[0].board, finalStream, timing || existing[0].timing, req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Batch updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/batches/:id
router.delete('/:id', instituteOnly, async (req, res) => {
  try {
    const [existing] = await db.query('SELECT * FROM batches WHERE id = ? AND institute_id = ?', [req.params.id, req.user.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Batch not found' });
    await db.query('DELETE FROM batches WHERE id = ? AND institute_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Batch deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
