import { describe, expect, it } from 'vitest'

describe('Healthyweb worker', () => {
  const invalid = ['', 'asdf asdf']

  invalid.forEach((url) => {
    it(`returns 400 for invalid URL "${url}"`, async () => {
      const response = await fetch('http://localhost:8787', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      })
      expect(response.status).toBe(400)
    })
  })

  const pass = [
    'jquery.com',
    'https://jquery.com',
    'http://jquery.com',
    'drupal.org'
  ]

  pass.forEach((url) => {
    it(`retrieves a version for URL "${url}"`, async () => {
      const response = await fetch('http://localhost:8787', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      })
      const json: { url: string; version: string } = await response.json()
      expect(json.url).toContain(url)
      expect(json.version).toMatch(/^\d+\.\d+/)
    })
  })

  const noVersion = ['https://google.com', 'http://healthyweb.org']

  noVersion.forEach((url) => {
    it(`no version found for "${url}"`, async () => {
      const response = await fetch('http://localhost:8787', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      })
      const json: { url: string } = await response.json()
      expect(json.url).toContain(url)
      expect(json).not.toHaveProperty('version')
    })
  })
})
