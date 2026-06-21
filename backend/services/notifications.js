const db = require('../config/db');

let twilioFactory = null;
try {
  twilioFactory = require('twilio');
} catch (err) {
  twilioFactory = null;
}

const DEFAULT_COUNTRY_CODE = '+91';

function normalizePhone(rawPhone) {
  const input = String(rawPhone || '').trim();
  if (!input) return null;

  const compact = input.replace(/[\s()-]/g, '');
  if (/^\+\d{8,15}$/.test(compact)) return compact;
  if (/^00\d{8,15}$/.test(compact)) return `+${compact.slice(2)}`;

  const digits = compact.replace(/\D/g, '');
  if (/^\d{10}$/.test(digits)) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  if (/^\d{11,15}$/.test(digits)) return `+${digits}`;

  return null;
}

function asWhatsAppAddress(phoneE164) {
  return `whatsapp:${phoneE164}`;
}

function normalizeWhatsAppFrom(fromValue) {
  const value = String(fromValue || '').trim();
  if (!value) return null;
  return value.startsWith('whatsapp:') ? value : `whatsapp:${value}`;
}

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !twilioFactory) return null;
  return twilioFactory(sid, token);
}

async function trySendWhatsApp(client, toPhone, body) {
  const from = normalizeWhatsAppFrom(process.env.TWILIO_WHATSAPP_FROM);
  if (!from) {
    return { ok: false, error: 'Missing TWILIO_WHATSAPP_FROM' };
  }

  try {
    const msg = await client.messages.create({
      from,
      to: asWhatsAppAddress(toPhone),
      body,
    });
    return { ok: true, channel: 'whatsapp', sid: msg.sid };
  } catch (err) {
    let errorMsg = err.message || 'WhatsApp send failed';
    if (err.code === 21608) {
      errorMsg = 'Recipient hasn\'t joined WhatsApp Sandbox or number not verified (Trial Account)';
    } else if (err.code === 63003) {
      errorMsg = 'WhatsApp channel not yet activated or Sandbox session expired';
    }
    return { ok: false, error: errorMsg, code: err.code };
  }
}

async function trySendSMS(client, toPhone, body) {
  const from = String(process.env.TWILIO_SMS_FROM || '').trim();
  if (!from) {
    return { ok: false, error: 'Missing TWILIO_SMS_FROM' };
  }

  try {
    const msg = await client.messages.create({ from, to: toPhone, body });
    return { ok: true, channel: 'sms', sid: msg.sid };
  } catch (err) {
    let errorMsg = err.message || 'SMS send failed';
    if (err.code === 21608) {
      errorMsg = 'Recipient number is not verified in Twilio (Trial Account)';
    } else if (err.code === 21211) {
      errorMsg = 'Invalid phone number format';
    }
    return { ok: false, error: errorMsg, code: err.code };
  }
}

async function sendWithFallback({ toPhone, body, primaryChannel = 'sms' }) {
  const normalized = normalizePhone(toPhone);
  if (!normalized) {
    return {
      success: false,
      primaryChannel: 'sms',
      usedChannel: null,
      sid: null,
      phone: null,
      error: 'Invalid parent phone number',
    };
  }

  const client = getTwilioClient();
  if (!client) {
    return {
      success: false,
      primaryChannel: 'sms',
      usedChannel: null,
      sid: null,
      phone: normalized,
      error: 'Twilio not configured (missing package or env credentials)',
    };
  }

  let result;
  if (primaryChannel === 'whatsapp') {
    result = await trySendWhatsApp(client, normalized, body);
    if (!result.ok) {
      // Fallback to SMS
      result = await trySendSMS(client, normalized, body);
    }
  } else {
    result = await trySendSMS(client, normalized, body);
  }

  return {
    success: result.ok,
    primaryChannel,
    usedChannel: result.ok ? result.channel : null,
    sid: result.sid || null,
    phone: normalized,
    error: result.ok ? null : result.error,
  };
}

async function logDelivery({
  messageLogId,
  studentId = null,
  parentPhone = null,
  primaryChannel,
  usedChannel,
  sid,
  status,
  errorMessage,
}) {
  try {
    await db.query(
      `INSERT INTO message_deliveries
        (message_log_id, student_id, parent_phone, primary_channel, used_channel, twilio_sid, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageLogId,
        studentId || null,
        parentPhone || null,
        primaryChannel,
        usedChannel || null,
        sid || null,
        status,
        errorMessage || null,
      ]
    );
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
  }
}

async function notifyRecipients({
  instituteId,
  type,
  subject,
  message,
  batchId = null,
  recipients = [],
  buildMessage,
  primaryChannel = 'sms',
}) {
  const recipientCount = recipients.length;
  let result;
  try {
    [result] = await db.query(
      `INSERT INTO message_logs
        (institute_id, type, subject, message, batch_id, recipients_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [instituteId, type, subject, message, batchId || null, recipientCount]
    );
  } catch (err) {
    const invalidEnum = err.code === 'WARN_DATA_TRUNCATED' || err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD';
    if (!invalidEnum) throw err;
    [result] = await db.query(
      `INSERT INTO message_logs
        (institute_id, type, subject, message, batch_id, recipients_count)
       VALUES (?, 'custom', ?, ?, ?, ?)`,
      [instituteId, `[${String(type || '').toUpperCase()}] ${subject}`, message, batchId || null, recipientCount]
    );
  }
  const messageLogId = result.insertId;

  let sentCount = 0;
  let failedCount = 0;
  const deliveries = [];

  for (const recipient of recipients) {
    const perRecipientMessage = typeof buildMessage === 'function'
      ? buildMessage(recipient)
      : message;

    const sent = await sendWithFallback({
      toPhone: recipient.parent_phone,
      body: perRecipientMessage,
      primaryChannel,
    });

    const deliveryStatus = sent.success ? 'sent' : 'failed';
    if (sent.success) sentCount += 1;
    else failedCount += 1;

    await logDelivery({
      messageLogId,
      studentId: recipient.student_id || recipient.id || null,
      parentPhone: sent.phone || recipient.parent_phone || null,
      primaryChannel,
      usedChannel: sent.usedChannel,
      sid: sent.sid,
      status: deliveryStatus,
      errorMessage: sent.error,
    });

    deliveries.push({
      studentId: recipient.student_id || recipient.id || null,
      phone: sent.phone || recipient.parent_phone || null,
      status: deliveryStatus,
      channel: sent.usedChannel,
      twilioSid: sent.sid,
      error: sent.error,
    });
  }

  return { messageLogId, recipientCount, sentCount, failedCount, deliveries };
}

module.exports = {
  normalizePhone,
  notifyRecipients,
};
