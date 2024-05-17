/**
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run types`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import puppeteer from '@cloudflare/puppeteer'
import getVersion from './getVersion'
import normalizeUrl from './normalizeUrl'

export default {
  async fetch(
    request: Request,
    env: Env,
    _context: ExecutionContext
  ): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405
      })
    }
    let url: URL
    try {
      const json: { url: string } = await request.json()
      url = normalizeUrl(json.url)
    } catch (e) {
      return new Response('Invalid URL', {
        status: 400
      })
    }
    const worker = env.HEALTHYWEB as puppeteer.BrowserWorker

    // Pick random session from open sessions
    const sessionId = await getRandomSession(worker)
    let browser
    if (sessionId) {
      try {
        browser = await puppeteer.connect(worker, sessionId)
        console.log(`Connected to ${sessionId}`)
      } catch (e) {
        // another worker may have connected first
        console.error(`Failed to connect to ${sessionId}`, e)
      }
    }
    if (!browser) {
      // No open sessions, launch new session
      browser = await puppeteer.launch(worker)
      console.log(`Launched new browser at ${browser.sessionId()}`)
    }

    const page = await browser.newPage()
    let version
    try {
      version = await getVersion(page, url)
      return new Response(
        JSON.stringify({
          url,
          version
        }),
        {
          headers: {
            'content-type': 'application/json'
          }
        }
      )
    } catch (error) {
      const message = ((error as Error)?.message || '').toLowerCase()

      // Better message for URL not found
      if (message.includes('not_resolved')) {
        console.log(`404: Not Found for ${url}`)
        return new Response(JSON.stringify({
          message: '404: Not Found. Please check the URL.',
          url
        }))
      }

      if (message.includes('timed out') || message.includes('timeout')) {
        console.log(`Timeout loading ${url}`)
        return new Response(JSON.stringify({
          message: 'Timed out waiting for page to load. Please try again.'
        }))
      }

      console.log(`Error loading ${url}`)
      console.error(error)

      return new Response(JSON.stringify({
        message: 'Error detecting version. Please try again later.'
      }), {
        status: 500
      })
    } finally {
      // All work done, so free connection (IMPORTANT!)
      browser.disconnect()
    }
  }
} satisfies ExportedHandler<Env>

// Pick random free session
async function getRandomSession(
  endpoint: puppeteer.BrowserWorker
): Promise<string | undefined> {
  const sessions: puppeteer.ActiveSession[] =
    await puppeteer.sessions(endpoint)
  console.log('Getting random session', endpoint, sessions)
  const sessionsIds = sessions
    // remove sessions with workers connected to them
    .filter((v) => !v.connectionId)
    .map((v) => v.sessionId)

  if (sessionsIds.length === 0) {
    return
  }

  const sessionId =
    sessionsIds[Math.floor(Math.random() * sessionsIds.length)]

  return sessionId
}
