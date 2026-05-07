// Mailerlite helper functions for Edge Function
// This file contains the email sending logic using Mailerlite API

const MAILERLITE_API_URL = 'https://connect.mailerlite.com/api'

interface EmailData {
  type: 'confirmation' | 'cancellation' | 'reminder'
  customerEmail: string
  customerName: string
  customerPhone?: string
  businessName: string
  serviceName: string
  appointmentDate: string
  appointmentTime: string
  price?: number
  notes?: string
  bookingId?: string
  cancellationReason?: string
}

// Get email HTML based on type
function getEmailHtml(data: EmailData): string {
  const { type, customerName, businessName, serviceName, appointmentDate, appointmentTime, price, notes, bookingId, cancellationReason } = data

  const commonFooter = `
    <tr>
      <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
        <p style="margin: 0 0 10px; color: #999999; font-size: 12px;">
          This is an automated email from ${businessName}
        </p>
        <p style="margin: 0; color: #999999; font-size: 12px;">
          © ${new Date().getFullYear()} ${businessName}. All rights reserved.
        </p>
      </td>
    </tr>
  `

  if (type === 'confirmation') {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); padding: 40px 30px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 15px;">✂️</div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">Appointment Confirmed!</h1>
                      <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Your barber is ready for you</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        Hi <strong>${customerName}</strong>,
                      </p>
                      <p style="margin: 0 0 30px; color: #666666; font-size: 15px; line-height: 1.6;">
                        Great news! Your appointment has been confirmed. We're looking forward to giving you a fresh new look!
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-left: 5px solid #22c55e; border-radius: 8px; margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 25px;">
                            <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px; font-weight: 600;">📋 Appointment Details</h2>
                            <table width="100%" cellpadding="8" cellspacing="0">
                              ${bookingId ? `
                              <tr>
                                <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong style="color: #333333;">Booking ID:</strong></td>
                                <td style="color: #1a1a1a; font-size: 14px; text-align: right; padding: 8px 0; font-weight: 600;">#${bookingId}</td>
                              </tr>
                              ` : ''}
                              <tr>
                                <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong style="color: #333333;">Service:</strong></td>
                                <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0;">${serviceName}</td>
                              </tr>
                              <tr>
                                <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong style="color: #333333;">Date:</strong></td>
                                <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0;">${appointmentDate}</td>
                              </tr>
                              <tr>
                                <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong style="color: #333333;">Time:</strong></td>
                                <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0;">${appointmentTime}</td>
                              </tr>
                              ${price ? `
                              <tr>
                                <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong style="color: #333333;">Price:</strong></td>
                                <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0;">$${price}</td>
                              </tr>
                              ` : ''}
                              ${notes ? `
                              <tr>
                                <td colspan="2" style="color: #666666; font-size: 14px; padding: 12px 0 0;">
                                  <strong style="color: #333333;">Notes:</strong><br>
                                  <span style="color: #666666;">${notes}</span>
                                </td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>
                      </table>
                      <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                        <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                          <strong>Please arrive 5-10 minutes early</strong> to ensure your appointment starts on time.
                        </p>
                      </div>
                      <p style="margin: 0 0 25px; color: #666666; font-size: 15px; line-height: 1.6;">
                        <strong>Need to reschedule or cancel?</strong><br>
                        Call us at least 24 hours in advance or reply to this email.
                      </p>
                      <p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.6;">
                        See you soon!<br>
                        <em style="color: #1a1a1a; font-weight: 600;">- ${businessName} Team</em>
                      </p>
                    </td>
                  </tr>
                  ${commonFooter}
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `
  }

  if (type === 'cancellation') {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Cancelled</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 15px;">✕</div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">Appointment Cancelled</h1>
                      <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Your appointment has been cancelled</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        Hi <strong>${customerName}</strong>,
                      </p>
                      <p style="margin: 0 0 30px; color: #666666; font-size: 15px; line-height: 1.6;">
                        Your appointment has been cancelled as requested. We're sorry we won't be seeing you this time.
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-left: 5px solid #dc2626; border-radius: 8px; margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 25px;">
                            <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px; font-weight: 600;">📋 Cancelled Appointment</h2>
                            <table width="100%" cellpadding="8" cellspacing="0">
                              <tr>
                                <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong style="color: #333333;">Service:</strong></td>
                                <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0;">${serviceName}</td>
                              </tr>
                              <tr>
                                <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong style="color: #333333;">Date:</strong></td>
                                <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0;">${appointmentDate}</td>
                              </tr>
                              <tr>
                                <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong style="color: #333333;">Time:</strong></td>
                                <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0;">${appointmentTime}</td>
                              </tr>
                              ${cancellationReason ? `
                              <tr>
                                <td colspan="2" style="color: #666666; font-size: 14px; padding: 12px 0 0;">
                                  <strong style="color: #333333;">Reason:</strong><br>
                                  <span style="color: #666666;">${cancellationReason}</span>
                                </td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>
                      </table>
                      <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                          <strong>Want to reschedule?</strong><br>
                          You can book a new appointment anytime by visiting our website or giving us a call.
                        </p>
                      </div>
                      <p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.6;">
                        We hope to see you soon!<br>
                        <em style="color: #1a1a1a; font-weight: 600;">- ${businessName} Team</em>
                      </p>
                    </td>
                  </tr>
                  ${commonFooter}
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `
  }

  // Reminder email
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Reminder</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 15px;">⏰</div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">Appointment Reminder</h1>
                    <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Your appointment is coming up soon</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${customerName}</strong>,
                    </p>
                    <p style="margin: 0 0 30px; color: #666666; font-size: 15px; line-height: 1.6;">
                      This is a friendly reminder about your upcoming appointment tomorrow. We're looking forward to seeing you!
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-left: 5px solid #f59e0b; border-radius: 8px; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 25px;">
                          <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px; font-weight: 600;">📋 Appointment Details</h2>
                          <table width="100%" cellpadding="8" cellspacing="0">
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong style="color: #333333;">Service:</strong></td>
                              <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0;">${serviceName}</td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong style="color: #333333;">Date:</strong></td>
                              <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0;">${appointmentDate}</td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong style="color: #333333;">Time:</strong></td>
                              <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0;">${appointmentTime}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                        <strong>Don't forget!</strong> Please arrive 5-10 minutes early.
                      </p>
                    </div>
                    <p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.6;">
                      See you soon!<br>
                      <em style="color: #1a1a1a; font-weight: 600;">- ${businessName} Team</em>
                    </p>
                  </td>
                </tr>
                ${commonFooter}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

// Get email subject based on type
function getEmailSubject(data: EmailData): string {
  const { type, serviceName } = data
  
  switch (type) {
    case 'confirmation':
      return `✂️ Appointment Confirmed - ${serviceName}`
    case 'cancellation':
      return `✕ Appointment Cancelled - ${serviceName}`
    case 'reminder':
      return `⏰ Reminder: Your ${serviceName} appointment is tomorrow`
    default:
      return `Appointment Update`
  }
}

// Create or update subscriber in Mailerlite
async function createSubscriber(email: string, name: string, apiKey: string) {
  try {
    const response = await fetch(`${MAILERLITE_API_URL}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        fields: {
          name,
          last_activity: new Date().toISOString(),
        },
      }),
    })

    if (!response.ok && response.status !== 422) { // 422 = already exists
      const error = await response.text()
      console.error('Failed to create subscriber:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error creating subscriber:', error)
    return { success: false, error: String(error) }
  }
}

// Main function to send email via Mailerlite
export async function sendEmailViaMailerlite(data: EmailData, apiKey: string): Promise<{ success: boolean; campaignId?: string; error?: string }> {
  try {
    // First, ensure the subscriber exists in Mailerlite
    await createSubscriber(data.customerEmail, data.customerName, apiKey)

    // Create a campaign in Mailerlite
    const campaignRes = await fetch(`${MAILERLITE_API_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name: `${data.type}-${Date.now()}`,
        type: 'regular',
        emails: [{
          subject: getEmailSubject(data),
          content: getEmailHtml(data),
          from_name: data.businessName,
          from: 'noreply@barbershop.app',
        }],
      }),
    })

    if (!campaignRes.ok) {
      const errorData = await campaignRes.text()
      throw new Error(`Mailerlite campaign creation failed: ${errorData}`)
    }

    const campaign = await campaignRes.json()

    // Schedule the campaign to send immediately
    const scheduleRes = await fetch(`${MAILERLITE_API_URL}/campaigns/${campaign.data.id}/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        delivery: 'instant',
      }),
    })

    if (!scheduleRes.ok) {
      const errorData = await scheduleRes.text()
      throw new Error(`Mailerlite campaign scheduling failed: ${errorData}`)
    }

    return { success: true, campaignId: campaign.data.id }
  } catch (error) {
    console.error('Error sending email via Mailerlite:', error)
    return { success: false, error: String(error) }
  }
}
