import nodemailer from 'nodemailer'

export async function sendPasswordResetEmail(email: string, code: string) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  const from = process.env.SMTP_FROM || '7anime Security <no-reply@7anime.io>'

  if (!host || !user || !pass) {
    console.log(
      `[7anime-mailer] SMTP credentials not fully configured. Code for ${email}: ${code}`,
    )
    return { success: true, mocked: true }
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  })

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #080a0f; color: #ffffff; padding: 40px 20px; text-align: center;">
      <div style="max-width: 480px; margin: 0 auto; background: rgba(18, 22, 34, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
        <div style="font-size: 24px; font-weight: 800; letter-spacing: -0.03em; color: #55d8ff; margin-bottom: 24px;">
          7anime Pass
        </div>
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #ffffff;">Password Reset Request</h2>
        <p style="font-size: 14px; color: rgba(255, 255, 255, 0.7); line-height: 1.5; margin-bottom: 24px;">
          We received a request to reset the password for your 7anime account. Use the 6-digit verification code below to proceed:
        </p>
        <div style="background: rgba(85, 216, 255, 0.1); border: 1px solid rgba(85, 216, 255, 0.3); border-radius: 12px; padding: 16px; font-size: 32px; font-weight: 800; letter-spacing: 0.25em; color: #55d8ff; margin-bottom: 24px;">
          ${code}
        </div>
        <p style="font-size: 12px; color: rgba(255, 255, 255, 0.5); line-height: 1.5; margin-bottom: 16px;">
          This code will expire in <strong>10 minutes</strong>.
        </p>
        <p style="font-size: 12px; color: #ff6b6b; line-height: 1.5; margin-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px;">
          ⚠️ Security Notice: Do NOT share this code with anyone. 7anime staff will never ask for your verification code.
        </p>
      </div>
    </div>
  `

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: 'Your 7anime Password Reset Code',
      html: htmlContent,
    })
    return { success: true, mocked: false }
  } catch (err) {
    console.error('[7anime-mailer] Failed to send SMTP email:', err)
    return { success: false, error: err }
  }
}
