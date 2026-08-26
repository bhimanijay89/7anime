import 'dotenv/config'
import { sendPasswordResetEmail } from '../utils/mailer.js'

async function testEmail() {
  const targetEmail = process.argv[2] || 'bricodz07@gmail.com'

  console.log('=====================================================')
  console.log('[Resend Email Test] Testing Resend HTTPS API Dispatch')
  console.log('Target Email:', targetEmail)
  console.log('RESEND_API_KEY Configured:', Boolean(process.env.RESEND_API_KEY))
  console.log('=====================================================')

  if (!process.env.RESEND_API_KEY) {
    console.error('[Resend Email Test] FAILED: RESEND_API_KEY is not set in environment variables.')
    process.exit(1)
  }

  const result = await sendPasswordResetEmail(targetEmail, '888999')

  if (result.success) {
    console.log('[Resend Email Test] SUCCESS!')
    console.log('[Resend Email Test] Message ID:', result.messageId)
  } else {
    console.error('[Resend Email Test] FAILED!')
    console.error('[Resend Email Test] Error Code:', result.errorCode)
    console.error('[Resend Email Test] Error Message:', result.error)
  }
}

testEmail()
