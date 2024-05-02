/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import puppeteer from '@cloudflare/puppeteer'
import getVersion from './getVersion'
import normalizeUrl from './normalizeUrl'

export default {
  async fetch(
    request: Request,
    env: Env /*, context: ExecutionContext */
  ): Promise<Response> {
    const inputUrl = new URL(request.url).searchParams.get('url')
    if (!inputUrl) {
      return new Response('No URL provided', {
        status: 400
      })
    }
    const url = normalizeUrl(inputUrl)
    console.log(env)
    const worker = env.HEALTHYWEB as puppeteer.BrowserWorker

    // Pick random session from open sessions
    const sessionId = await this.getRandomSession(worker)
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
    } catch (e) {
      console.error('Hit an error retriving jQuery version', e)
    } finally {
      // All work done, so free connection (IMPORTANT!)
      browser.disconnect()
    }

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
  },

  // Pick random free session
  // Other custom logic could be used instead
  async getRandomSession(
    endpoint: puppeteer.BrowserWorker
  ): Promise<string | undefined> {
    const sessions: puppeteer.ActiveSession[] =
      await puppeteer.sessions(endpoint)
    console.log(`Sessions: ${JSON.stringify(sessions)}`)
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
}
