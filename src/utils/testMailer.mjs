// src/utils/testMailer.mjs

import { sendMail } from './mailer.mjs';

sendMail({
  to: 'itsmesourav101@gmail.com',
  subject: 'DW-DURGA Test Email',
  text: 'Hello, this is a test email from DW-DURGA.',
}).then(() => {
  console.log('Test email sent successfully.');
}).catch((err) => {
  console.error('Test email failed:', err);
});