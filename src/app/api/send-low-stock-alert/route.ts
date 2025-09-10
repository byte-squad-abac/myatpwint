import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, bookName, availableStock, threshold } = body;

    // Validate required fields
    if (!bookId || !bookName || typeof availableStock !== 'number' || typeof threshold !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Email content
    const emailData = {
      to: 'myatpwint25byte@gmail.com',
      from: 'noreply@myatpwint.com', // You'll need to set up your domain
      subject: `🚨 Low Stock Alert - ${bookName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { background: #f8f9fa; padding: 20px; }
            .alert-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Low Stock Alert</h1>
              <p>MyatPwint Publishing Platform</p>
            </div>
            
            <div class="content">
              <h2>📚 ${bookName}</h2>
              
              <div class="alert-box">
                <strong>⚠️ Stock Level Critical</strong>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #f8f9fa;">
                  <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Current Stock:</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6; color: #dc3545; font-weight: bold;">${availableStock} copies</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Alert Threshold:</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${threshold} copies</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Alert Time:</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
              
              <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #0c5460;">📦 Action Required</h3>
                <p style="margin-bottom: 0; color: #0c5460;">Please restock this book to avoid stockouts and potential lost sales.</p>
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated alert from MyatPwint Publishing Platform</p>
              <p>Book ID: ${bookId}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Initialize Resend with API key from environment
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Send email with Resend
    const emailResult = await resend.emails.send({
      from: 'MyatPwint Platform <alerts@resend.dev>', // Using Resend's test domain
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    });

    if (emailResult.error) {
      console.error('❌ Resend error:', emailResult.error);
      throw new Error(emailResult.error.message);
    }

    console.log('✅ Low stock email sent successfully:', emailResult.data?.id);

    return NextResponse.json({
      success: true,
      message: 'Low stock alert processed',
      bookName,
      availableStock,
      threshold
    });

  } catch (error) {
    console.error('Error sending low stock alert:', error);
    return NextResponse.json(
      { error: 'Failed to send alert' },
      { status: 500 }
    );
  }
}