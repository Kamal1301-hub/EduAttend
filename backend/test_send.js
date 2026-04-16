const dotenv = require('dotenv');
const twilio = require('twilio');
const path = require('path');

dotenv.config();

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(sid, token);

const db = require('./config/db');

async function runTest() {
  try {
    let studentName = "Manual Test";
    let toPhone = process.argv[2]; // Take phone from command line: node test_send.js +91...

    if (!toPhone) {
      console.log('📡 Fetching a dynamic recipient from your database...');
      const [students] = await db.query('SELECT name, parent_phone FROM students ORDER BY id DESC LIMIT 1');
      
      if (students.length === 0) {
        console.log('❌ No students found in database.');
        process.exit(1);
      }
      
      studentName = students[0].name;
      const rawPhone = students[0].parent_phone;
      toPhone = rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone}`;
    }

    console.log(`\n--- Dynamic Twilio Test ---`);
    console.log(`Recipient Name : ${studentName}`);
    console.log(`Recipient Phone: ${toPhone}`);
    console.log(`Source         : ${process.argv[2] ? 'Command Line' : 'Database'}`);

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(sid, token);
    const fromWhatsApp = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;

    console.log(`\n🚀 Sending WhatsApp message via Twilio...`);

    const msg = await client.messages.create({
      from: fromWhatsApp,
      to: `whatsapp:${toPhone}`,
      body: `Hello ${studentName}, this is a dynamic test message from your EduAttend system!`
    });

    console.log('✅ SUCCESS! Twilio SID:', msg.sid);
    process.exit(0);
  } catch (err) {
    console.log('\n❌ FAILED!');
    console.log('Error Message:', err.message);
    process.exit(1);
  }
}

runTest();
