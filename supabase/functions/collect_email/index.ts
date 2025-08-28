import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailSignupRequest {
  email: string;
  name?: string;
  signup_type?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("📧 Email collection function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { email, name, signup_type = "waitlist" }: EmailSignupRequest = await req.json();

    console.log("📧 Processing signup for:", email);

    if (!email) {
      throw new Error("Email is required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Store email in database
    const { data: signupData, error: dbError } = await supabase
      .from("email_signups")
      .insert({
        email,
        name,
        signup_type,
      })
      .select()
      .single();

    if (dbError && dbError.code !== "23505") { // 23505 is unique constraint violation
      console.error("Database error:", dbError);
      throw new Error("Failed to save email");
    }

    // If email already exists, we'll still send a thank you note
    let alreadySignedUp = false;
    if (dbError && dbError.code === "23505") {
      alreadySignedUp = true;
      console.log("📧 Email already exists:", email);
    }

    // Send thank you email
    const emailSubject = alreadySignedUp 
      ? "Thanks for your continued interest!" 
      : "Thanks for joining the waitlist!";

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">AI</span>
          </div>
          <h1 style="color: #1f2937; margin: 0; font-size: 28px;">
            ${alreadySignedUp ? "We hear you!" : "Welcome to the Waitlist!"}
          </h1>
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            ${name ? `Hi ${name},` : "Hi there,"}
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            ${alreadySignedUp 
              ? "Thanks for your continued interest in custom AI agents! You're already on our waitlist, and we'll be in touch as soon as spots become available."
              : "Thank you for joining the waitlist for custom AI agents! We're excited to help you create your own AI version."
            }
          </p>

          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
            <ul style="color: #6b7280; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li style="margin-bottom: 8px;">We'll reach out with availability updates</li>
              <li style="margin-bottom: 8px;">Early access to custom AI agent features</li>
              <li style="margin-bottom: 8px;">Personalized onboarding when ready</li>
            </ul>
          </div>

          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
            In the meantime, feel free to <a href="https://williammwhite.com/chat" style="color: #667eea; text-decoration: none;">try out AI William</a> to see the technology in action!
          </p>
        </div>

        <div style="text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">
            Best regards,<br>
            <strong>William MacDonald White</strong><br>
            AI Consultant & Business Expert
          </p>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px;">
              This email was sent because you requested early access to custom AI agents.<br>
              Visit <a href="https://williammwhite.com" style="color: #667eea;">williammwhite.com</a> to learn more.
            </p>
          </div>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "William White <onboarding@resend.dev>",
      to: [email],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("📧 Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: alreadySignedUp 
          ? "Thanks for your continued interest! We'll be in touch." 
          : "Successfully joined the waitlist! Check your email for confirmation.",
        alreadySignedUp 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("📧 Error in collect_email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "An unexpected error occurred" 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);