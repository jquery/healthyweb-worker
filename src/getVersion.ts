import type { Page } from '@cloudflare/puppeteer'

declare global {
  interface Window {
    jQuery?: { fn: { jquery: string } }
    $?: { fn: { jquery: string } }
  }
}

export default async function getVersion(page: Page, url: URL) {
  function evalVersion() {
    return page.evaluate(() => {
      const $ = window.jQuery || window.$
      if ($) {
        // Ignore custom/slim jQuery versions
        return $.fn?.jquery?.match(/^(\d+\.\d+(?:\.\d+)?)/)?.[1]
      }
    })
  }

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
  )
  await page.goto(url.href, {
    timeout: 30000,
    waitUntil: 'load'
  })
  const version = await evalVersion()
  if (version) return version

  // Wait longer if version not detected
  console.log(`Waiting until network idle for ${url.href}...`)
  await page.waitForNetworkIdle({ idleTime: 100, timeout: 30000 })
  return evalVersion()
}
