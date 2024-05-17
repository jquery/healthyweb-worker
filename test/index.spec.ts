// test/index.spec.ts
import {
  SELF,
  createExecutionContext, env, waitOnExecutionContext
} from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from "../src/index";

describe('Healthyweb worker', () => {

  const invalid = [
    '',
    'asdf asdf'
  ]

  invalid.forEach(url => {
    it(`returns 400 for invalid URL "${url}"`, async () => {
      const request = new Request('http://example.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url })
        });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    })
  })

  it('returns a 404 message for URL not found', async () => {
    const request = new Request('http://example.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: 'http://asdf' })
      });
    const response = await SELF.fetch('http://example.com', request);
    const json: { url: string, message: string } = await response.json()
    expect(json.url).toEqual('http://asdf')
    expect(json.message).toContain('404')
  })

  const pass = [
    'jquery.com',
    'https://jquery.com',
    'http://jquery.com'
  ]

  pass.forEach(url => {
    it(`retrieves a version for URL "${url}"`, async () => {
      const request = new Request('http://example.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(200);
      const json: { url: string, version: string } = await response.json()
      expect(json.url).toContain(url)
      expect(json.version).toMatch(/^\d+\.\d+/);
    })
  })
})
