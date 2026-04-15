const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { instituteOnly } = require('../middleware/auth');
const { notifyRecipients } = require('../services/notifications');

// GET /api/messages
router.get('/', instituteOnly, async (req, res) => {
  try {
    let rows;
    try {
      [rows] = await db.query(
        `SELECT ml.*, b.name AS batch_name,
                COALESCE(md.sent_count, 0) AS sent_count,
                COALESCE(md.failed_count, 0) AS failed_count
         FROM message_logs ml
         LEFT JOIN batches b ON b.id = ml.batch_id
         LEFT JOIN (
           SELECT message_log_id,
                  SUM(status = 'sent') AS sent_count,
                  SUM(status = 'failed') AS failed_count
           FROM message_deliveries
           GROUP BY message_log_id
         ) md ON md.message_log_id = ml.id
         WHERE ml.institute_id = ?
         ORDER BY ml.sent_at DESC LIMIT 100`,
        [req.user.id]
      );
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
      [rows] = await db.query(
        `SELECT ml.*, b.name AS batch_name, 0 AS sent_count, 0 AS failed_count
         FROM message_logs ml
         LEFT JOIN batches b ON b.id = ml.batch_id
         WHERE ml.institute_id = ?
         ORDER BY ml.sent_at DESC LIMIT 100`,
        [req.user.id]
      );
    }
    res.json({ success:true, data:rows });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/messages/send  — general announcement to parents
router.post('/send', instituteOnly, async (req, res) => {
  try {
    const { type, subject, message, batchId } = req.body;
    if (!type || !subject || !message)
      return res.status(400).json({ success:false, message:'Type, subject and message are required' });
    if (!['test', 'ptm', 'holiday', 'custom'].includes(type))
      return res.status(400).json({ success:false, message:'Invalid message type' });

    const phoneParams  = [req.user.id];
    let phoneQuery     = 'SELECT id AS student_id, parent_name, parent_phone, parent_email, name FROM students WHERE institute_id = ?';

    if (batchId) {
      phoneQuery += ' AND batch_id = ?';
      phoneParams.push(batchId);
    }

    const [recipients] = await db.query(phoneQuery, phoneParams);
    const notifyResult = await notifyRecipients({
      instituteId: req.user.id,
      type,
      subject,
      message,
      batchId: batchId || null,
      recipients,
    });

    res.json({
      success:  true,
      message:  `Notification attempted for ${notifyResult.recipientCount} parent(s)`,
      data: {
        id: notifyResult.messageLogId,
        recipients: notifyResult.recipientCount,
        sent: notifyResult.sentCount,
        failed: notifyResult.failedCount,
        phones: recipients.map(r => r.parent_phone),
      }
    });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/messages/send-credentials/:studentId
// Re-send login credentials of a specific student to their parent
router.post('/send-credentials/:studentId', instituteOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id,name,student_login_id,parent_name,parent_phone,batch_id FROM students WHERE id=? AND institute_id=?',
      [req.params.studentId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, message:'Student not found' });
    const s = rows[0];
    if (!s.student_login_id) return res.status(400).json({ success:false, message:'No credentials generated for this student' });

    const subject = `Login Credentials for ${s.name}`;
    const message = `Dear ${s.parent_name},\n\nYour ward ${s.name} has been registered on EduAttend.\n\nStudent Login ID: ${s.student_login_id}\nDefault Password: 123456\n\nPlease login at the EduAttend portal and change the password immediately.\n\nRegards,\nEduAttend`;
    const notifyResult = await notifyRecipients({
      instituteId: req.user.id,
      type: 'credentials',
      subject,
      message,
      batchId: s.batch_id || null,
      recipients: [{
        student_id: s.id,
        parent_phone: s.parent_phone,
      }],
    });

    res.json({
      success: true,
      message: `Credentials notification attempted for ${s.parent_name} (${s.parent_phone})`,
      data: {
        id: notifyResult.messageLogId,
        sent: notifyResult.sentCount,
        failed: notifyResult.failedCount,
      },
    });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;
