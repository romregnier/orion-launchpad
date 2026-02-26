export interface PageMeta {
  title: string
  description?: string
  image?: string
  favicon?: string
  color?: string
}

// Use microlink.io free API to extract OG metadata
export async function fetchMeta(url: string): Promise<PageMeta> {
  try {
    const api = `https://api.microlink.io/?url=${encodeURIComponent(url)}&palette=true`
    const res = await fetch(api)
    const data = await res.json()
    const d = data?.data

    return {
      title: d?.title ?? new URL(url).hostname,
      description: d?.description ?? undefined,
      image: d?.image?.url ?? d?.screenshot?.url ?? undefined,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`,
      color: d?.palette?.DarkVibrant ?? d?.palette?.Vibrant ?? undefined,
    }
  } catch {
    const hostname = (() => { try { return new URL(url).hostname } catch { return url } })()
    return {
      title: hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
    }
  }
}
