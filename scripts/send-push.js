#!/usr/bin/env node
/**
 * send-push.js
 * Usage: node scripts/send-push.js <title> <body> [url]
 * Envoie une notification push à tous les subscribers
 */
const webPush = require('web-push')
const { createClient } = require('@supabase/supabase-js')

const VAPID_PUBLIC = process.env.VAPID_PUBLIC || 'BCeeDWX-PB0Q8JjdyUUliEyH7VYMJR7CbrTxiwadtcyU6EyxAO9oD-NBWgGdRqJdBpUU2kGlfepMBI9VChfQpHk'
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || 'PLACEHOLDER_SET_ENV_VAPID_PRIVATE'
const VAPID_EMAIL = 'mailto:orion@launchpad.app'

const supabase = createClient(
  'https://tpbluellqgehaqmmmunp.supabase.co',
  process.env.SUPABASE_KEY
)

webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

async function main() {
  const [,, title = 'Launchpad', body = 'Notification', url = '/'] = process.argv

  const { data: subs } = await supabase.from('push_subscriptions').select('subscription')
  if (!subs?.length) { console.log('No subscribers'); return }

  const payload = JSON.stringify({ title, body, url, icon: 'https://orion-launchpad.surge.sh/favicon.ico' })

  let sent = 0
  for (const { subscription } of subs) {
    try {
      await webPush.sendNotification(subscription, payload)
      sent++
    } catch (e) {
      console.log('Failed for sub:', e.statusCode)
    }
  }
  console.log(`Sent ${sent}/${subs.length} notifications`)
}

main().catch(console.error)
