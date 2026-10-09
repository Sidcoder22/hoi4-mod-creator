import { test, expect } from 'vitest'
import { miniSpieldaten } from '../hilfe.js'
import { pruefeBonus, bonusText } from '../../src/projekt/boni.js'

const sd = await miniSpieldaten()

test('pruefeBonus', () => {
  expect(pruefeBonus({ art: 'konsumgueter', wert: -10 }, sd)).toBeNull()
  expect(pruefeBonus({ art: 'konsumgueter', wert: 80 }, sd)).toBe('«Konsumgüter» muss zwischen -50 und 50 liegen.')
  expect(pruefeBonus({ art: 'konsumgueter', wert: 'x' }, sd)).toBe('«Konsumgüter» muss zwischen -50 und 50 liegen.')
  expect(pruefeBonus({ art: 'frei', modifier: 'Consumer Goods', wert: 0.1 }, sd)).toMatch(/ungültigen Namen/)
  expect(pruefeBonus({ art: 'frei', modifier: 'consumer_goods_factor', wert: 0.1 }, sd)).toBeNull()
  expect(pruefeBonus({ art: 'gibtsnicht', wert: 1 }, sd)).toBe('Unbekannter Bonus «gibtsnicht».')
})

test('bonusText', () => {
  expect(bonusText({ art: 'konsumgueter', wert: -10 }, sd)).toBe('Konsumgüter -10 %')
  expect(bonusText({ art: 'frei', modifier: 'consumer_goods_factor', wert: -0.05 }, sd)).toBe('Konsumgüter -5 %')
  expect(bonusText({ art: 'politische_macht', wert: 0.5 }, sd)).toBe('Politische Macht pro Tag +0.5 pro Tag')
})
