const dotenv = require('dotenv');
const twilio = require('twilio');

dotenv.config();

console.log('--- Twilio Configuration Check ---');
console.log('ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'MISSING');
console.log('AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'MISSING');
console.log('WHATSAPP_FROM:', process.env.TWILIO_WHATSAPP_FROM || 'MISSING');
console.log('SMS_FROM:', process.env.TWILIO_SMS_FROM || 'MISSING');

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;

if (!sid || !token) {
  console.log('Status: Missing credentials in .env');
  process.exit(1);
}

const client = twilio(sid, token);
console.log('Twilio client: INITIALIZED');

console.log('Validating credentials with API call...');
client.api.v2010.accounts(sid).fetch()
  .then(account => {
    console.log('Twilio API status: SUCCESS');
    console.log('Account Name:', account.friendlyName);
    console.log('Account Status:', account.status);
    process.exit(0);
  })
  .catch(err => {
    console.log('Twilio API status: FAILED');
    console.log('Error Code:', err.code);
    console.log('Error Message:', err.message);
    process.exit(1);
  });
