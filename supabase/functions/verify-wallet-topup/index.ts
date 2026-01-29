import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, status: session.payment_status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const userId = session.metadata?.user_id;
    const amount = parseFloat(session.metadata?.amount || "0");

    if (!userId || amount <= 0) {
      throw new Error("Invalid session metadata");
    }

    // Get or create user wallet
    let { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .insert({ user_id: userId, balance: 0 })
        .select()
        .single();
      
      if (walletError) throw walletError;
      wallet = newWallet;
    }

    // Check if this payment was already processed
    const { data: existingTxn } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id")
      .eq("reference_id", session.id)
      .maybeSingle();

    if (existingTxn) {
      console.log("Payment already processed:", session.id);
      return new Response(JSON.stringify({ success: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create transaction record
    const { error: txnError } = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        amount,
        transaction_type: "credit",
        description: "Wallet top-up via Stripe",
        reference_id: session.id,
        payment_gateway: "stripe",
        status: "completed",
      });

    if (txnError) throw txnError;

    // Update wallet balance
    const { error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({ balance: wallet.balance + amount })
      .eq("id", wallet.id);

    if (updateError) throw updateError;

    console.log("Wallet topped up successfully:", { userId, amount, sessionId });

    return new Response(JSON.stringify({ success: true, newBalance: wallet.balance + amount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error verifying payment:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
