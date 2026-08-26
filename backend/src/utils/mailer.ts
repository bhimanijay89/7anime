import nodemailer from 'nodemailer'

export interface MailerResult {
  success: boolean
  mocked?: boolean
  errorCode?: 'NOT_CONFIGURED' | 'EAUTH' | 'ECONNECTION' | 'ESEND'
  error?: string
  messageId?: string
  response?: string
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  const from = process.env.SMTP_FROM || (user ? `7anime Security <${user}>` : '7anime Security <no-reply@7anime.io>')

  return { host, port, user, pass, from }
}

export function isSmtpConfigured(): boolean {
  const { host, user, pass } = getSmtpConfig()
  return Boolean(host && user && pass)
}

export async function verifySmtpConnection(): Promise<MailerResult> {
  const { host, port, user, pass } = getSmtpConfig()

  if (!host || !user || !pass) {
    return {
      success: false,
      errorCode: 'NOT_CONFIGURED',
      error: 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) are not fully configured in environment variables.',
    }
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    connectTimeout: 10000,
  } as unknown as nodemailer.TransportOptions)

  try {
    await transporter.verify()
    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    const errCode = (err as { code?: string })?.code || ''

    if (errCode === 'EAUTH' || errorMsg.includes('535') || errorMsg.includes('BadCredentials')) {
      return {
        success: false,
        errorCode: 'EAUTH',
        error: 'Gmail SMTP authentication failed (535 BadCredentials). Please check your SMTP_USER and Google App Password in .env.',
      }
    }

    return {
      success: false,
      errorCode: 'ECONNECTION',
      error: `SMTP connection error (${errCode || 'UNKNOWN'}): ${errorMsg}`,
    }
  }
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<MailerResult> {
  const { host, port, user, pass, from } = getSmtpConfig()

  console.log(`[7anime-mailer] Initiating password reset email to ${email}...`)
  console.log(`[7anime-mailer] Config: host=${host}, port=${port}, user=${user || 'NOT_SET'}, passSet=${Boolean(pass)}`)

  if (!host || !user || !pass) {
    console.warn(`[7anime-mailer] SMTP not configured. Cannot send real reset email. Mock code for ${email}: ${code}`)
    return {
      success: false,
      errorCode: 'NOT_CONFIGURED',
      error: 'SMTP server is not configured on the backend.',
    }
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    connectTimeout: 10000,
  } as unknown as nodemailer.TransportOptions)

  const logoUrl = process.env.PUBLIC_LOGO_URL || 'https://7anime-tv.vercel.app/logo.png'

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your 7anime Password Reset Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #05070d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #05070d; table-layout: fixed; padding: 40px 16px;">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin: 0 auto;">
          
          <!-- BRAND LOGO HEADER -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <img src="${logoUrl}" alt="7anime" width="160" style="display:block;width:160px;max-width:100%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>

          <!-- MAIN GLASSMORPHIC CARD -->
          <tr>
            <td style="background-color: #0f131f; border: 1px solid #1e293b; border-radius: 18px; padding: 36px 30px; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);">
              
              <!-- HEADER -->
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.01em;">
                Password Reset Request
              </h1>
              
              <!-- DECORATIVE DIVIDER -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 14px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="height: 2px; width: 64px; background: #38bdf8; border-radius: 2px;"></div>
                  </td>
                </tr>
              </table>

              <!-- DESCRIPTION -->
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #94a3b8; text-align: center;">
                We received a request to reset the password for your 7anime account. Use the 6-digit verification code below to proceed.
              </p>

              <!-- OTP CONTAINER -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td align="center" style="background-color: #090d16; border: 1px solid #0284c7; border-radius: 14px; padding: 22px 16px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase; margin-bottom: 12px;">
                      YOUR VERIFICATION CODE
                    </div>
                    <div style="font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #38bdf8; font-family: 'Courier New', Courier, monospace; line-height: 1; margin-left: 12px;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- EXPIRY SECTION -->
              <p style="margin: 0 0 28px 0; font-size: 13px; color: #64748b; text-align: center;">
                ⏱️ This code will expire in <span style="color: #38bdf8; font-weight: 600;">10 minutes</span>.
              </p>

              <!-- SECURITY WARNING BOX -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background-color: #1a1018; border: 1px solid #7f1d1d; border-radius: 10px; padding: 14px 18px;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #fca5a5; text-align: center;">
                      <strong>🛡️ Security Notice:</strong> Do NOT share this code with anyone. 7anime staff will never ask for your verification code.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding-top: 28px; padding-bottom: 12px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: #64748b;">
                7anime — Your Ultimate Anime Destination
              </p>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #475569;">
                © 2026 7anime. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const info = await transporter.sendMail({
      from,
      to: email,
      subject: 'Your 7anime Password Reset Code',
      html: htmlContent,
    })

    console.log(`[7anime-mailer] Password reset email sent successfully to ${email}. MessageID: ${info.messageId}`)
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    const errCode = (err as { code?: string })?.code || 'UNKNOWN'

    console.error(`[7anime-mailer] Failed to send SMTP email to ${email}. Code: ${errCode}, Error: ${errorMsg}`)

    let errorCode: MailerResult['errorCode'] = 'ESEND'
    let userFriendlyError = 'Failed to send password reset email.'

    if (errCode === 'EAUTH' || errorMsg.includes('535') || errorMsg.includes('BadCredentials')) {
      errorCode = 'EAUTH'
      userFriendlyError = 'Email authentication failed (Invalid Google App Password).'
    } else if (errCode === 'ECONNECTION' || errCode === 'ETIMEDOUT' || errCode === 'ESOCKET') {
      errorCode = 'ECONNECTION'
      userFriendlyError = 'Could not connect to SMTP email server.'
    }

    return {
      success: false,
      errorCode,
      error: userFriendlyError,
    }
  }
}


