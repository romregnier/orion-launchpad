/**
 * usePushNotifications
 * Enregistre le Service Worker, demande la permission push,
 * stocke la subscription dans push_subscriptions Supabase.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) ?? 'BCeeDWX-PB0Q8JjdyUUliEyH7VYMJR7CbrTxiwadtcyU6EyxAO9oD-NBWgGdRqJdBpUU2kGlfepMBI9VChfQpHk'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications(userId: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission)
  }, [])

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !userId) return

    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })

      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        subscription: sub.toJSON(),
      })

      setSubscribed(true)
    } catch (err) {
      console.error('Push subscription error:', err)
    }
  }, [userId])

  return { permission, subscribed, subscribe }
}
