const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { instituteOnly } = require('../middleware/auth');
const { notifyRecipients } = require('../services/notifications');

// ══════════════════════════════════════════════════════════════
// IMPORTANT: Static routes (/submit, /summary, /dashboard)
// MUST come before any /:param routes to avoid Express
// matching the dynamic segment first.
// ══════════════════════════════════════════════════════════════

// ── SUBMIT ATTENDANCE ─────────────────────────────────────────
// POST /api/attendance/submit
router.post('/submit', instituteOnly, async (req, res) => {
  const conn = await db.getConnection();
  let txOpen = false;
  try {
    const { batchId, date, records } = req.body;

    if (!batchId || !date || !records || typeof records !== 'object') {
      return res.status(400).json({ success: false, message: 'batchId, date and records are required' });
    }

    // Verify the batch belongs to this institute
    const [batch] = await conn.query(
      `SELECT b.id, b.name AS batch_name, i.name AS institute_name
       FROM batches b
       JOIN institutes i ON i.id = b.institute_id
       WHERE b.id = ? AND b.institute_id = ?`,
      [batchId, req.user.id]
    );
    if (!batch.length) {
      return res.status(403).json({ success: false, message: 'Batch not found or access denied' });
    }

    // Check if already submitted (for resubmit detection)
    const [existing] = await conn.query(
      'SELECT id, is_resubmitted FROM attendance_submissions WHERE batch_id = ? AND date = ? AND institute_id = ?',
      [batchId, date, req.user.id]
    );
    const isResubmit = existing.length > 0;

    await conn.beginTransaction();
    txOpen = true;

    // Insert / update each student record
    const entries = Object.entries(records);
    for (const [studentId, status] of entries) {
      if (!['P', 'A', 'L'].includes(status)) continue; // skip invalid status values

      if (isResubmit) {
        // ON DUPLICATE KEY: update status and mark resubmitted timestamp
        await conn.query(
          `INSERT INTO attendance (institute_id, batch_id, student_id, date, status, submitted_at, resubmitted_at)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             status         = VALUES(status),
             resubmitted_at = NOW()`,
          [req.user.id, batchId, studentId, date, status]
        );
      } else {
        // First submission — no resubmitted_at
        await conn.query(
          `INSERT INTO attendance (institute_id, batch_id, student_id, date, status, submitted_at)
           VALUES (?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             status       = VALUES(status),
             submitted_at = NOW()`,
          [req.user.id, batchId, studentId, date, status]
        );
      }
    }

    // Update / insert submission record
    if (isResubmit) {
      await conn.query(
        `UPDATE attendance_submissions
         SET resubmitted_at = NOW(), is_resubmitted = TRUE
         WHERE batch_id = ? AND date = ? AND institute_id = ?`,
        [batchId, date, req.user.id]
      );
    } else {
      await conn.query(
        `INSERT INTO attendance_submissions (institute_id, batch_id, date, submitted_at)
         VALUES (?, ?, ?, NOW())`,
        [req.user.id, batchId, date]
      );
    }

    await conn.commit();
    txOpen = false;

    // Auto-send absentee alerts to only absent students (A)
    const absentIds = entries
      .filter(([studentId, status]) => status === 'A' && Number.isInteger(Number(studentId)))
      .map(([studentId]) => Number(studentId));

    let absenteeNotification = null;
    if (absentIds.length) {
      try {
        const placeholders = absentIds.map(() => '?').join(',');
        const [absentStudents] = await db.query(
          `SELECT id AS student_id, name, parent_name, parent_phone
           FROM students
           WHERE institute_id = ? AND batch_id = ? AND id IN (${placeholders})`,
          [req.user.id, batchId, ...absentIds]
        );

        if (absentStudents.length) {
          const subject = `Absentee Alert — ${batch[0].batch_name} (${date})`;
          const genericMessage = `Dear Parent,\n\nThis is to inform you that your ward was marked absent on ${date}.\n\nRegards,\n${batch[0].institute_name}`;
          const notifyResult = await notifyRecipients({
            instituteId: req.user.id,
            type: 'absentee',
            subject,
            message: genericMessage,
            batchId,
            recipients: absentStudents,
            buildMessage: (student) => (
              `Dear ${student.parent_name},\n\nThis is to inform you that your ward ${student.name} was marked absent on ${date} in batch ${batch[0].batch_name}.\n\nPlease contact the institute for details.\n\nRegards,\n${batch[0].institute_name}`
            ),
          });

          absenteeNotification = {
            logId: notifyResult.messageLogId,
            recipients: notifyResult.recipientCount,
            sent: notifyResult.sentCount,
            failed: notifyResult.failedCount,
          };
        }
      } catch (notifyErr) {
        absenteeNotification = { error: notifyErr.message };
      }
    }

    res.json({
      success:     true,
      message:     isResubmit ? 'Attendance resubmitted successfully' : 'Attendance submitted successfully',
      isResubmit,
      absenteeNotification,
    });
  } catch (err) {
    if (txOpen) await conn.rollback();
    console.error('Submit attendance error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ── GET ATTENDANCE SUMMARY PER STUDENT ────────────────────────
// GET /api/attendance/summary?batchId=x
router.get('/summary', instituteOnly, async (req, res) => {
  try {
    const { batchId } = req.query;

    let sql = `
      SELECT
        s.id,
        s.name,
        s.parent_phone,
        s.batch_id,
        COUNT(a.id)                                              AS total_days,
        COALESCE(SUM(a.status = 'P'), 0)                        AS present,
        COALESCE(SUM(a.status = 'A'), 0)                        AS absent,
        COALESCE(SUM(a.status = 'L'), 0)                        AS late,
        ROUND(
          COALESCE(SUM(a.status = 'P'), 0)
          / NULLIF(COUNT(a.id), 0) * 100, 0
        )                                                        AS percentage
      FROM students s
      LEFT JOIN attendance a
        ON  a.student_id   = s.id
        AND a.institute_id = ?
      WHERE s.institute_id = ?`;

    const params = [req.user.id, req.user.id];

    if (batchId) {
      sql += ' AND s.batch_id = ?';
      params.push(batchId);
    }

    sql += ' GROUP BY s.id ORDER BY s.name ASC';

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DASHBOARD SUMMARY (today per batch) ───────────────────────
// GET /api/attendance/dashboard
router.get('/dashboard', instituteOnly, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [rows] = await db.query(
      `SELECT
         b.id,
         b.name,
         COUNT(DISTINCT s.id)                  AS total_students,
         COALESCE(SUM(a.status = 'P'), 0)      AS present,
         COALESCE(SUM(a.status = 'A'), 0)      AS absent,
         COALESCE(SUM(a.status = 'L'), 0)      AS late,
         sub.is_resubmitted,
         IF(sub.id IS NOT NULL, 1, 0)          AS is_submitted
       FROM batches b
       LEFT JOIN students s
         ON  s.batch_id     = b.id
       LEFT JOIN attendance a
         ON  a.student_id   = s.id
         AND a.date         = ?
         AND a.institute_id = ?
       LEFT JOIN attendance_submissions sub
         ON  sub.batch_id   = b.id
         AND sub.date       = ?
         AND sub.institute_id = ?
       WHERE b.institute_id = ?
       GROUP BY b.id, b.name, sub.id, sub.is_resubmitted`,
      [today, req.user.id, today, req.user.id, req.user.id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ATTENDANCE FOR A BATCH + DATE ─────────────────────────
// GET /api/attendance?batchId=x&date=YYYY-MM-DD
router.get('/', instituteOnly, async (req, res) => {
  try {
    const { batchId, date } = req.query;
    if (!batchId || !date) {
      return res.status(400).json({ success: false, message: 'batchId and date are required' });
    }

    const [records] = await db.query(
      'SELECT student_id, status FROM attendance WHERE batch_id = ? AND date = ? AND institute_id = ?',
      [batchId, date, req.user.id]
    );

    const [submission] = await db.query(
      'SELECT id, is_resubmitted FROM attendance_submissions WHERE batch_id = ? AND date = ? AND institute_id = ?',
      [batchId, date, req.user.id]
    );

    // Convert rows to { studentId: status } map
    const attMap = {};
    records.forEach(r => { attMap[r.student_id] = r.status; });

    res.json({
      success: true,
      data: {
        attendance:    attMap,
        isSubmitted:   submission.length > 0,
        isResubmitted: submission.length > 0 && submission[0].is_resubmitted,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
