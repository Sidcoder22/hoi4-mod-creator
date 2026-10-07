import { test, expect } from 'vitest'
import { erstelleVerlauf } from '../../src/projekt/verlauf.js'

test('rueckgaengig und wiederholen', () => {
  const v = erstelleVerlauf()
  expect(v.kannZurueck()).toBe(false)
  v.merke('a')
  v.merke('b')
  expect(v.rueckgaengig('c')).toBe('b')
  expect(v.kannVor()).toBe(true)
  expect(v.wiederholen('b')).toBe('c')
  expect(v.rueckgaengig('c')).toBe('b')
  expect(v.rueckgaengig('b')).toBe('a')
  expect(v.rueckgaengig('a')).toBeNull()
})

test('merke nach rueckgaengig leert vor', () => {
  const v = erstelleVerlauf()
  v.merke('a')
  v.rueckgaengig('b')
  v.merke('a')
  expect(v.kannVor()).toBe(false)
  expect(v.wiederholen('x')).toBeNull()
})

test('hoechstens 100 Schritte', () => {
  const v = erstelleVerlauf(100)
  for (let i = 0; i < 101; i++) v.merke(i)
  let n = 0
  let z = 'jetzt'
  while ((z = v.rueckgaengig(z)) !== null) n++
  expect(n).toBe(100)
})
