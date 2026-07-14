import {
  FLUID_GROUP,
  ITEM_GROUPS,
  ITEM_SET,
  isFluid,
  mergeCustomItems,
  parseCustomItems,
  parseCustomItemsImport,
} from './catalog'

describe('isFluid', () => {
  it('recognizes fluids case-insensitively', () => {
    expect(isFluid('Water')).toBe(true)
    expect(isFluid('water')).toBe(true)
    expect(isFluid('Nitrogen Gas')).toBe(true)
  })
  it('rejects solids and empties', () => {
    expect(isFluid('Iron Ore')).toBe(false)
    expect(isFluid('')).toBe(false)
    expect(isFluid(null)).toBe(false)
    expect(isFluid(undefined)).toBe(false)
  })
})

describe('catalog integrity', () => {
  it('ITEM_SET contains both solids and fluids', () => {
    expect(ITEM_SET.has('Iron Ore')).toBe(true)
    expect(ITEM_SET.has('Water')).toBe(true)
    expect(ITEM_SET.has('Definitely Not An Item')).toBe(false)
  })
  it('every group is sorted alphabetically', () => {
    for (const [, items] of ITEM_GROUPS) {
      expect(items).toEqual([...items].sort())
    }
    expect(FLUID_GROUP[1]).toEqual([...FLUID_GROUP[1]].sort())
  })
})

describe('parseCustomItems', () => {
  it('splits lines, trims, and preserves order', () => {
    expect(parseCustomItems('  Coffee Cup \nSpare Parts\n')).toEqual(['Coffee Cup', 'Spare Parts'])
  })
  it('drops blank lines, duplicates (first wins), and catalog collisions', () => {
    expect(parseCustomItems('Merch\n\nMerch\nIron Ore\n  \nCoffee')).toEqual(['Merch', 'Coffee'])
  })
  it('returns an empty list for blank input', () => {
    expect(parseCustomItems('')).toEqual([])
    expect(parseCustomItems('\n  \n')).toEqual([])
  })
})

describe('parseCustomItemsImport', () => {
  it('parses a plain newline list', () => {
    expect(parseCustomItemsImport('Merch\nCoffee\n')).toEqual(['Merch', 'Coffee'])
  })
  it('parses a JSON array of strings', () => {
    expect(parseCustomItemsImport('["Merch", "Coffee", "Merch"]')).toEqual(['Merch', 'Coffee'])
  })
  it('pulls customItems out of a full world/object export', () => {
    expect(parseCustomItemsImport('{"name":"W","customItems":["Merch","Iron Ore","Coffee"]}')).toEqual([
      'Merch',
      'Coffee',
    ])
  })
  it('falls back to newline parsing when JSON is malformed', () => {
    expect(parseCustomItemsImport('[not json\nMerch')).toEqual(['[not json', 'Merch'])
  })
})

describe('mergeCustomItems', () => {
  it('appends new items, keeping existing first and dropping duplicates', () => {
    expect(mergeCustomItems(['Merch', 'Coffee'], ['Coffee', 'Spare Parts'])).toEqual([
      'Merch',
      'Coffee',
      'Spare Parts',
    ])
  })
})
