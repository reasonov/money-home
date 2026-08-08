const STRIP_HEADERS = new Set([
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'cf-worker',
])

function buildUpstreamHeaders(request, upstreamHost, { keepUpgrade = false } = {}) {
  const headers = new Headers()
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase()
    if (STRIP_HEADERS.has(lower)) {
      continue
    }
    if (!keepUpgrade && (lower === 'upgrade' || lower === 'connection')) {
      continue
    }
    headers.set(key, value)
  }
  headers.set('Host', upstreamHost)
  return headers
}

export default {
  async fetch(request, env) {
    const upstreamHost = env.SUPABASE_HOSTNAME
    if (!upstreamHost) {
      return new Response('SUPABASE_HOSTNAME is not configured', { status: 500 })
    }

    const incoming = new URL(request.url)
    const targetUrl = `https://${upstreamHost}${incoming.pathname}${incoming.search}`
    const isWebsocket = request.headers.get('Upgrade')?.toLowerCase() === 'websocket'
    const headers = buildUpstreamHeaders(request, upstreamHost, { keepUpgrade: isWebsocket })

    if (isWebsocket) {
      return fetch(targetUrl, {
        method: request.method,
        headers,
      })
    }

    const method = request.method.toUpperCase()
    const init = {
      method,
      headers,
      redirect: 'manual',
    }

    if (method !== 'GET' && method !== 'HEAD') {
      init.body = request.body
    }

    return fetch(targetUrl, init)
  },
}
