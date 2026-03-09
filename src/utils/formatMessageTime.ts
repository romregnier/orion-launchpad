export function formatMessageTime(isoDate: string): { relative: string; absolute: string } {
  const d = new Date(isoDate)
  const diff = (Date.now() - d.getTime()) / 1000
  let relative: string
  if (diff < 60) relative = 'À l\'instant'
  else if (diff < 3600) relative = `il y a ${Math.floor(diff / 60)} min`
  else if (diff < 86400) relative = `il y a ${Math.floor(diff / 3600)} h`
  else relative = `il y a ${Math.floor(diff / 86400)} j`
  const absolute = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return { relative, absolute }
}
