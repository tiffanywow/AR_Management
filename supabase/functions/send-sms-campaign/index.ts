import { createClient } from 'npm:@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SMSRequest {
  campaignId: string;
  testMode?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Twilio credentials from secrets
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioMessagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');

    // Validate required Twilio credentials
    if (!twilioAccountSid || !twilioAuthToken) {
      return new Response(
        JSON.stringify({
          error: 'Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN secrets.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!twilioMessagingServiceSid) {
      return new Response(
        JSON.stringify({
          error: 'Twilio Messaging Service SID not configured. Please set TWILIO_MESSAGING_SERVICE_SID secret.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { campaignId, testMode = false }: SMSRequest = await req.json();

    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('sms_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update campaign status to sending
    await supabase
      .from('sms_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);

    // Build query for recipients
    let query = supabase
      .from('memberships')
      .select('id, full_name, phone_number, region, status');

    if (campaign.filter_type === 'individual' && campaign.filter_value) {
      query = query.eq('id', campaign.filter_value);
    } else if (campaign.filter_type === 'region' && campaign.filter_value) {
      query = query.eq('region', campaign.filter_value);
    } else if (campaign.filter_type === 'membership_status' && campaign.filter_value) {
      query = query.eq('status', campaign.filter_value);
    }

    if (testMode) {
      query = query.limit(1);
    }

    const { data: recipients, error: recipientsError } = await query;

    if (recipientsError || !recipients) {
      await supabase
        .from('sms_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignId);

      return new Response(
        JSON.stringify({ error: 'Failed to fetch recipients' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    // Send SMS to each recipient
    for (const recipient of recipients) {
      if (!recipient.phone_number) {
        skippedCount++;
        continue;
      }

      try {
        const params = new URLSearchParams();
        params.append('To', recipient.phone_number);
        params.append('MessagingServiceSid', twilioMessagingServiceSid);
        params.append('Body', campaign.message);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        });

        if (response.ok) {
          successCount++;
        } else {
          const errorText = await response.text();
          failedCount++;
          console.error(`Failed to send SMS to ${recipient.phone_number}:`, errorText);
        }
      } catch (error) {
        failedCount++;
        console.error(`Error sending SMS to ${recipient.phone_number}:`, error);
      }
    }

    // Update campaign with final results
    await supabase
      .from('sms_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: recipients.length,
        success_count: successCount,
        failed_count: failedCount + skippedCount,
      })
      .eq('id', campaignId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS campaign completed',
        totalRecipients: recipients.length,
        successCount,
        failedCount,
        skippedCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-sms-campaign:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});