const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');

function sign(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// ─── SUPER ADMIN LOGIN ────────────────────────────────────────
router.post('/admin/login', async (req, res) => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password)
      return res.status(400).json({ success:false, message:'Login ID and password are required' });

    const [rows] = await db.query('SELECT * FROM super_admin WHERE login_id = ?', [loginId]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password)))
      return res.status(401).json({ success:false, message:'Invalid credentials' });

    const a = rows[0];
    const token = sign({ id:a.id, loginId:a.login_id, role:'superadmin', name:a.name });
    res.json({ success:true, token, user:{ id:a.id, loginId:a.login_id, name:a.name, email:a.email, role:'superadmin' } });
  } catch(err) {
    console.error('Admin login:', err);
    res.status(500).json({ success:false, message:'Server error' });
  }
});

// ─── INSTITUTE LOGIN ──────────────────────────────────────────
router.post('/institute/login', async (req, res) => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password)
      return res.status(400).json({ success:false, message:'Login ID and password are required' });

    const [rows] = await db.query('SELECT * FROM institutes WHERE login_id = ?', [loginId]);
    if (!rows.length)
      return res.status(401).json({ success:false, message:'Invalid credentials' });

    const inst = rows[0];
    if (inst.status === 'Suspended')
      return res.status(403).json({ success:false, message:'Account suspended. Contact EduAttend administrator.' });
    if (inst.status === 'Expired')
      return res.status(403).json({ success:false, message:'Subscription expired. Contact EduAttend administrator.' });
    if (!(await bcrypt.compare(password, inst.password)))
      return res.status(401).json({ success:false, message:'Invalid credentials' });

    const token = sign({ id:inst.id, loginId:inst.login_id, role:'institute', name:inst.name, plan:inst.plan });
    res.json({
      success:true, token,
      user:{ id:inst.id, loginId:inst.login_id, name:inst.name, city:inst.city, state:inst.state, plan:inst.plan, code:inst.code, status:inst.status, role:'institute' }
    });
  } catch(err) {
    console.error('Institute login:', err);
    res.status(500).json({ success:false, message:'Server error' });
  }
});

// ─── STUDENT LOGIN ────────────────────────────────────────────
// Uses student_login_id and student_password columns
router.post('/student/login', async (req, res) => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password)
      return res.status(400).json({ success:false, message:'Student ID and password are required' });

    const [rows] = await db.query(
      `SELECT s.*,
              b.name  AS batch_name,
              i.name  AS institute_name,
              i.city  AS institute_city,
              i.code  AS institute_code
       FROM   students s
       LEFT JOIN batches    b ON b.id  = s.batch_id
       LEFT JOIN institutes i ON i.id = s.institute_id
       WHERE  s.student_login_id = ?`,
      [loginId]
    );

    if (!rows.length)
      return res.status(401).json({ success:false, message:'Invalid Student ID or Password' });

    const s = rows[0];

    if (!s.student_password)
      return res.status(401).json({ success:false, message:'Login not set up yet. Contact your institute.' });
    if (!s.is_active)
      return res.status(403).json({ success:false, message:'Account inactive. Contact your institute.' });
    if (!(await bcrypt.compare(password, s.student_password)))
      return res.status(401).json({ success:false, message:'Invalid Student ID or Password' });

    const token = sign({
      id:          s.id,
      loginId:     s.student_login_id,
      role:        'student',
      name:        s.name,
      instituteId: s.institute_id,
      batchId:     s.batch_id,
      mustChange:  !!s.must_change_pass,
    });

    res.json({
      success:true, token,
      user:{
        id:            s.id,
        loginId:       s.student_login_id,
        name:          s.name,
        class:         s.class,
        board:         s.board,
        stream:        s.stream,
        batchId:       s.batch_id,
        batchName:     s.batch_name,
        parentName:    s.parent_name,
        parentPhone:   s.parent_phone,
        instituteName: s.institute_name,
        instituteCity: s.institute_city,
        instituteId:   s.institute_id,
        mustChange:    !!s.must_change_pass,
        role:          'student',
      }
    });
  } catch(err) {
    console.error('Student login:', err);
    res.status(500).json({ success:false, message:'Server error' });
  }
});

// ─── VERIFY TOKEN ─────────────────────────────────────────────
router.get('/verify', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success:false, message:'No token' });
  try {
    res.json({ success:true, user: jwt.verify(token, process.env.JWT_SECRET) });
  } catch {
    res.status(401).json({ success:false, message:'Invalid token' });
  }
});

module.exports = router;
