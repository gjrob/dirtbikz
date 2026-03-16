// Twilio webhook — receives STOP replies and records opt-outs
// Set Twilio SMS webhook URL to: https://[domain]/api/nurture/optout
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.formData()
  const from = body.get('From') as string | null
  const text = (body.get('Body') as string | null)?.trim().toUpperCase()

  if (from && text === 'STOP') {
    await supabase
      .from('nurture_optouts')
      .upsert({ phone: from }, { onConflict: 'phone' })
  }

  // Return empty TwiML so Twilio doesn't send an auto-reply
  return new NextResponse('<Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
