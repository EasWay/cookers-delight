import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('MenuPage — WhatsApp checkout', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../pages/MenuPage.tsx'), 'utf-8'
  )

  it('does not use the wrong GHC currency symbol in the order message', () => {
    expect(src).not.toMatch(/`[^`]*GHC[^`]*`/)
  })

  it('phone number is extracted to a WHATSAPP_NUMBER constant', () => {
    expect(src).toContain('WHATSAPP_NUMBER')
  })

  it('wa.me URL uses the constant, not a hardcoded number', () => {
    expect(src).not.toContain('wa.me/233243379412')
  })
})
