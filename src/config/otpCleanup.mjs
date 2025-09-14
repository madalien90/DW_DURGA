// src/config/otpCleanup.mjs

import cron from 'node-cron';
import pool from './db.mjs';


// Schedule OTP cleanup every minute (testing mode)
/*cron.schedule('* * * * *', async () => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM otps WHERE expires_at < NOW()`
    );
    if (rowCount > 0) {
      console.log(`⏳ OTP Cleanup: Deleted ${rowCount} expired OTP(s)`);
    } else {
      console.log('⏳ OTP Cleanup: No expired OTPs found');
    }
  } catch (err) {
    console.error('❌ OTP cleanup error:', err);
  }
});*/


// Run on every hour (production mode)
cron.schedule(
  '0 * * * *',
  async () => {
    try {
      const result = await pool.query(
        `DELETE FROM otps 
         WHERE used = true OR expires_at < now()`
      );
      console.log(`[OTP Cleanup] Removed ${result.rowCount} expired/used records`);
    } catch (err) {
      console.error('[OTP Cleanup] Error:', err.message);
    }
  },
  {
    scheduled: true,
    timezone: 'Asia/Kolkata'   // 'UTC'
  }
);