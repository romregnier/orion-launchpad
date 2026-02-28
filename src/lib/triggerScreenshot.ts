export async function triggerScreenshot(projectId: string, url: string): Promise<void> {
  // Appel vers une Supabase Edge Function (à créer) ou un endpoint local
  // Pour le MVP : log + TODO connecter à Supabase Edge Function quand disponible
  console.log('Screenshot requested for', projectId, url)
  // TODO: connecter à Supabase Edge Function quand disponible
}
