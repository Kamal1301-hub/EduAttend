const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../config/db');
const { superAdminOnly } = require('../middleware/auth');
const { notifyRecipients } = require('../services/notifications');

// ── HELPERS ───────────────────────────────────────────────────
function genLoginId(name, id) {
  const abbr = name.trim().split(/\s+/).map(w => w[0].toUpperCase()).join('').slice(0, 3);
  return `${abbr}${new Date().getFullYear()}${String(id).padStart(3, '0')}`;
}
function genPassword() {
  const sp = ['@', '#', '$', '!'];
  return 'Inst' + sp[Math.floor(Math.random() * 4)] + Math.floor(1000 + Math.random() * 9000);
}
function addMonths(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + parseInt(months || 12));
  return d.toISOString().split('T')[0];
}

// ══════════════════════════════════════════════════════════════
// IMPORTANT: Static/named routes MUST come before /:id
// otherwise Express matches /:id first for /logs/all, /stats/overview etc.
// ══════════════════════════════════════════════════════════════

// ── GET STATS ─────────────────────────────────────────────────
// GET /api/institutes/stats/overview
router.get('/stats/overview', superAdminOnly, async (req, res) => {
  try {
    const [[total]]     = await db.query('SELECT COUNT(*) AS total FROM institutes');
    const [[active]]    = await db.query("SELECT COUNT(*) AS active FROM institutes WHERE status = 'Active'");
    const [[suspended]] = await db.query("SELECT COUNT(*) AS suspended FROM institutes WHERE status = 'Suspended'");
    const [[expired]]   = await db.query('SELECT COUNT(*) AS expired FROM institutes WHERE expiry_date < CURDATE()');
    const [[students]]  = await db.query('SELECT COALESCE(SUM(students_count), 0) AS total FROM institutes');

    res.json({
      success: true,
      data: {
        total:         total.total,
        active:        active.active,
        suspended:     suspended.suspended,
        expired:       expired.expired,
        totalStudents: students.total,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ACTIVITY LOGS ─────────────────────────────────────────
// GET /api/institutes/logs/all
router.get('/logs/all', superAdminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ALL INSTITUTES ────────────────────────────────────────
// GET /api/institutes
router.get('/', superAdminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, code, name, description, website, principal_name, establishment_year, achievements, awards, city, state, email, phone, contact_person,
              plan, status, login_id, join_date, expiry_date, students_count, created_at
       FROM institutes
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET SINGLE INSTITUTE ──────────────────────────────────────
// GET /api/institutes/:id
router.get('/:id', superAdminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, code, name, description, website, principal_name, establishment_year, achievements, awards, city, state, email, phone, contact_person,
              plan, status, login_id, join_date, expiry_date, students_count
       FROM institutes WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Institute not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── CREATE INSTITUTE ──────────────────────────────────────────
// POST /api/institutes
router.post('/', superAdminOnly, async (req, res) => {
  try {
    const { name, description, website, principal_name, establishment_year, achievements, awards, city, state, email, phone, contactPerson, plan, durationMonths } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Institute name is required' });
    }

    const plainPassword  = genPassword();
    const hashedPassword = plainPassword;
    const joinDate       = new Date().toISOString().split('T')[0];
    const expiryDate     = addMonths(durationMonths);

    // Insert with TEMP placeholders first to get the auto-increment ID
    const [result] = await db.query(
      `INSERT INTO institutes
         (code, name, description, website, principal_name, establishment_year, achievements, awards, city, state, email, phone, contact_person, plan, status, login_id, password, join_date, expiry_date, students_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, 0)`,
      [
        'TEMP',
        name.trim(),
        description || '',
        website     || '',
        principal_name || '',
        establishment_year || null,
        achievements || '',
        awards      || '',
        city        || '',
        state       || '',
        email       || '',
        phone       || '',
        contactPerson || '',
        plan        || 'Standard',
        'TEMP',          // login_id placeholder
        hashedPassword,
        joinDate,
        expiryDate,
      ]
    );

    const realId  = result.insertId;
    const loginId = genLoginId(name.trim(), realId);

    // Update with real loginId and code
    await db.query(
      'UPDATE institutes SET login_id = ?, code = ? WHERE id = ?',
      [loginId, loginId, realId]
    );

    // Log activity
    await db.query(
      'INSERT INTO activity_logs (action, institute_name) VALUES (?, ?)',
      ['Institute registered', name.trim()]
    );

    // ── SEND WELCOME NOTIFICATION ──
    if (phone) {
      try {
        const websiteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const welcomeMessage = `Hello ${name.trim()},\n\nWelcome to EduAttend! Your institute has been successfully registered.\n\nLogin ID: *${loginId}*\nPassword: *${plainPassword}*\n\nLogin here: ${websiteUrl}\n\nYou can now login and start managing your batches and students.\n\nBest Regards,\nEduAttend Team`;
        
        await notifyRecipients({
          instituteId: realId,
          type: 'credentials',
          subject: 'Institute Registration - Welcome to EduAttend',
          message: welcomeMessage,
          recipients: [{
            student_id: null,
            parent_phone: phone.trim()
          }]
        });
      } catch (err) {
        console.error('Failed to send welcome message:', err.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Institute registered successfully and notification sent.',
      data:    { id: realId, loginId, password: plainPassword, name: name.trim(), plan: plan || 'Standard' },
    });
  } catch (err) {
    console.error('Create institute error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── UPDATE INSTITUTE ──────────────────────────────────────────
// PUT /api/institutes/:id
router.put('/:id', superAdminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM institutes WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Institute not found' });
    const existing = rows[0];

    const { name, description, website, principal_name, establishment_year, achievements, awards, city, state, email, phone, contactPerson, plan, status, expiryDate } = req.body;

    await db.query(
      `UPDATE institutes
       SET name=?, description=?, website=?, principal_name=?, establishment_year=?, achievements=?, awards=?, city=?, state=?, email=?, phone=?, contact_person=?,
           plan=?, status=?, expiry_date=?, updated_at=NOW()
       WHERE id=?`,
      [
        name          || existing.name,
        description   !== undefined ? description   : existing.description,
        website       !== undefined ? website       : existing.website,
        principal_name !== undefined ? principal_name : existing.principal_name,
        establishment_year !== undefined ? establishment_year : existing.establishment_year,
        achievements  !== undefined ? achievements  : existing.achievements,
        awards        !== undefined ? awards        : existing.awards,
        city          !== undefined ? city          : existing.city,
        state         !== undefined ? state         : existing.state,
        email         !== undefined ? email         : existing.email,
        phone         !== undefined ? phone         : existing.phone,
        contactPerson !== undefined ? contactPerson : existing.contact_person,
        plan          || existing.plan,
        status        || existing.status,
        expiryDate    || existing.expiry_date,
        req.params.id,
      ]
    );

    await db.query(
      'INSERT INTO activity_logs (action, institute_name) VALUES (?, ?)',
      ['Institute updated', existing.name]
    );

    res.json({ success: true, message: 'Institute updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── TOGGLE STATUS ─────────────────────────────────────────────
// PATCH /api/institutes/:id/status
router.patch('/:id/status', superAdminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM institutes WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Institute not found' });
    const inst      = rows[0];
    const newStatus = inst.status === 'Active' ? 'Suspended' : 'Active';

    await db.query('UPDATE institutes SET status = ? WHERE id = ?', [newStatus, req.params.id]);
    await db.query(
      'INSERT INTO activity_logs (action, institute_name) VALUES (?, ?)',
      [`Status changed to ${newStatus}`, inst.name]
    );

    res.json({ success: true, message: `Institute is now ${newStatus}`, newStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── RESET PASSWORD ────────────────────────────────────────────
// PATCH /api/institutes/:id/reset-password
router.patch('/:id/reset-password', superAdminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM institutes WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Institute not found' });

    const plainPassword  = genPassword();
    const hashedPassword = plainPassword;

    await db.query('UPDATE institutes SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
    await db.query(
      'INSERT INTO activity_logs (action, institute_name) VALUES (?, ?)',
      ['Password reset', rows[0].name]
    );

    // ── SEND RESET NOTIFICATION ──
    if (rows[0].phone) {
      try {
        const websiteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetMessage = `Hello ${rows[0].name},\n\nYour EduAttend login password has been reset by the administrator.\n\nNew Password: *${plainPassword}*\n\nLogin here: ${websiteUrl}\n\nPlease login and change it for security.\n\nRegards,\nEduAttend`;
        
        await notifyRecipients({
          instituteId: req.params.id,
          type: 'credentials',
          subject: 'EduAttend Password Reset',
          message: resetMessage,
          recipients: [{
            student_id: null,
            parent_phone: rows[0].phone.trim()
          }]
        });
      } catch (err) {
        console.error('Failed to send reset message:', err.message);
      }
    }

    res.json({ success: true, message: 'Password reset successfully and notification sent.', newPassword: plainPassword });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE INSTITUTE ──────────────────────────────────────────
// DELETE /api/institutes/:id
router.delete('/:id', superAdminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM institutes WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Institute not found' });

    await db.query('DELETE FROM institutes WHERE id = ?', [req.params.id]);
    await db.query(
      'INSERT INTO activity_logs (action, institute_name) VALUES (?, ?)',
      ['Institute deleted', rows[0].name]
    );

    res.json({ success: true, message: 'Institute deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
