import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const pythonApiUrl = Deno.env.get('PYTHON_ML_API_URL');
    
    if (!pythonApiUrl) {
      return new Response(
        JSON.stringify({ error: 'Python ML API URL not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Waking up Python ML service at:', pythonApiUrl);

    // Ping the health endpoint to wake up the service
    const response = await fetch(`${pythonApiUrl}/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const responseText = await response.text();
    console.log('Wake-up response:', response.status, responseText);

    if (response.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: response.status,
          message: 'Python ML service is awake',
          response: responseText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: response.status,
          error: 'Failed to wake up service',
          response: responseText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error waking up Python ML service:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});