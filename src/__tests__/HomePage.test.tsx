import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('CDBoatDownloadSection — removal', () => {

  it('component file no longer exists', () => {
    const filePath = path.resolve(
      __dirname, '../components/CDBoatDownloadSection.jsx'
    )
    expect(fs.existsSync(filePath)).toBe(false)
  })

  it('HomePage does not import CDBoatDownloadSection', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../pages/HomePage.tsx'), 'utf-8'
    )
    expect(src).not.toContain('CDBoatDownloadSection')
  })

  it('HomePage does not contain the string CDBoat anywhere', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../pages/HomePage.tsx'), 'utf-8'
    )
    expect(src).not.toContain('CDBoat')
  })

})
