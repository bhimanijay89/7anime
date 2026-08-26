import { google } from 'googleapis'
import { Resend } from 'resend'

export interface MailerResult {
  success: boolean
  mocked?: boolean
  errorCode?: 'NOT_CONFIGURED' | 'EAUTH' | 'ECONNECTION' | 'ESEND'
  error?: string
  messageId?: string
  response?: string
}

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    (process.env.NODE_ENV === 'production'
      ? 'https://sevenanime-vodw.onrender.com/api/auth/google/callback'
      : 'http://localhost:3001/api/auth/google/callback')

  if (!clientId || !clientSecret) return null

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function isMailerConfigured(): boolean {
  const hasGmailOAuth = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN)
  const hasResend = Boolean(process.env.RESEND_API_KEY)

  return hasGmailOAuth || hasResend
}

function makeRawMimeEmail(from: string, to: string, subject: string, htmlContent: string): string {
  const str = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlContent).toString('base64'),
  ].join('\r\n')

  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<MailerResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN
  const gmailUser = process.env.GMAIL_USER || 'bricodz07@gmail.com'
  const resendApiKey = process.env.RESEND_API_KEY

  const from = `7anime Security <${gmailUser}>`

  console.log(`[7anime-mailer] Initiating password reset email to ${email}...`)

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

  // 1. Primary Option: Gmail API via OAuth 2.0
  if (clientId && clientSecret && refreshToken) {
    console.log(`[7anime-mailer] Using Gmail API OAuth 2.0 dispatch...`)
    try {
      const oauth2Client = getOAuth2Client()
      if (!oauth2Client) throw new Error('OAuth2 client configuration error.')

      oauth2Client.setCredentials({ refresh_token: refreshToken })

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
      const rawMessage = makeRawMimeEmail(from, email, 'Your 7anime Password Reset Code', htmlContent)

      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
        },
      })

      console.log(`[7anime-mailer] Password reset email sent successfully via Gmail API. MessageID: ${res.data.id}`)
      return {
        success: true,
        messageId: res.data.id || undefined,
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`[7anime-mailer] Gmail API OAuth dispatch failed:`, errorMsg)

      return {
        success: false,
        errorCode: 'EAUTH',
        error: 'Failed to send password reset email via Gmail API OAuth 2.0.',
      }
    }
  }

  // 2. Fallback Option: Resend HTTPS API
  if (resendApiKey) {
    console.log(`[7anime-mailer] Falling back to Resend HTTPS API dispatch...`)
    try {
      const resend = new Resend(resendApiKey)
      const resendFrom = process.env.RESEND_FROM || '7anime Security <onboarding@resend.dev>'

      const { data, error } = await resend.emails.send({
        from: resendFrom,
        to: email,
        subject: 'Your 7anime Password Reset Code',
        html: htmlContent,
      })

      if (error) {
        console.error(`[7anime-mailer] Resend API error:`, error.name, error.message)
        return {
          success: false,
          errorCode: 'ESEND',
          error: error.message || 'Failed to send password reset email via Resend API.',
        }
      }

      console.log(`[7anime-mailer] Password reset email sent successfully via Resend. MessageID: ${data?.id}`)
      return {
        success: true,
        messageId: data?.id,
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`[7anime-mailer] Resend fallback exception:`, errorMsg)

      return {
        success: false,
        errorCode: 'ESEND',
        error: errorMsg || 'Failed to send password reset email via Resend API.',
      }
    }
  }

  console.warn(`[7anime-mailer] Neither Gmail OAuth nor Resend API keys are configured. Cannot send reset email.`)
  return {
    success: false,
    errorCode: 'NOT_CONFIGURED',
    error: 'Email transport credentials are not configured on the server.',
  }
}
