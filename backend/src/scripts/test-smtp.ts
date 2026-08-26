import 'dotenv/config'
import nodemailer from 'nodemailer'

async function runSmtpTest() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASSWORD || ''
  const from = process.env.SMTP_FROM || (user ? `7anime Security <${user}>` : '7anime Security <no-reply@7anime.io>')

  console.log('-------------------------------------------')
  console.log('[SMTP Diagnostic] Dual-Port Diagnostic (465 & 587)')
  console.log('-------------------------------------------')
  console.log('SMTP_HOST:', host)
  console.log('SMTP_USER:', user)
  console.log('SMTP_FROM:', from)
  console.log('SMTP_PASSWORD set?:', Boolean(pass))
  console.log('SMTP_PASSWORD length:', pass.length)
  console.log('-------------------------------------------')

  if (!host || !user || !pass) {
    console.error('❌ Missing SMTP environment variables in .env!')
    process.exit(1)
  }

  const testConfigs = [
    { port: 465, secure: true, label: 'Port 465 (SSL/TLS)' },
    { port: 587, secure: false, label: 'Port 587 (STARTTLS)' },
  ]

  for (const config of testConfigs) {
    console.log(`\n--- Testing ${config.label} ---`)
    const transporter = nodemailer.createTransport({
      host,
      port: config.port,
      secure: config.secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
    } as unknown as nodemailer.TransportOptions)

    try {
      console.log(`Verifying connection to ${host}:${config.port} (secure: ${config.secure})...`)
      await transporter.verify()
      console.log(`✅ SUCCESS on ${config.label}! Transporter authenticated cleanly.`)

      console.log(`Sending test email to ${user}...`)
      const info = await transporter.sendMail({
        from,
        to: user,
        subject: '7anime Password Reset Diagnostic Test',
        html: `<div style="font-family: sans-serif; padding: 20px; background: #080a0f; color: #ffffff;"><h3 style="color: #55d8ff;">7anime SMTP Diagnostic</h3><p>Email dispatch verified via ${config.label}.</p></div>`,
      })
      console.log(`✅ SEND SUCCESS on ${config.label}! MessageID: ${info.messageId}`)
      console.log(`SMTP Response: ${info.response}`)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      const errCode = (err as { code?: string })?.code || ''
      const errResp = (err as { response?: string })?.response || ''

      console.error(`❌ FAILED on ${config.label}:`, errorMsg)
      if (errCode) console.error('   Code:', errCode)
      if (errResp) console.error('   Response:', errResp)
    }
  }

  console.log('\n-------------------------------------------')
  console.log('[SMTP Diagnostic] Dual-Port Diagnostic Complete.')
  console.log('-------------------------------------------')
}

runSmtpTest()
