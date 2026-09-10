import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import { groupAreas, parseBivariate, rankAreas, summarizeEvidence } from './dashboardMetrics.ts'

const read = path => JSON.parse(readFileSync(new URL('../../public/data/' + path, import.meta.url)))
const features = read('amphoe_stats.geojson').features

test('area shares use aggregated denominators and density converts rai to km²', () => {
  const groups = [
    { code: 'large', name: 'Large', area: 100, total: 10000 },
    { code: 'small', name: 'Small', area: 50, total: 500 },
    { code: 'unknown', name: 'Unknown', area: 5, total: 0 },
  ]
  assert.equal(rankAreas(groups, 'area')[0].code, 'large')
  assert.equal(rankAreas(groups, 'share')[0].code, 'small')
  assert.equal(rankAreas(groups, 'share')[0].value, 10)
  assert.equal(rankAreas(groups, 'density')[0].value, 62.5)
  assert.equal(rankAreas(groups, 'share').length, 2)
})

test('unavailable priority is excluded while known zero remains a valid result', () => {
  const groups = ['a', 'b', 'c'].map(code => ({ code, name: code, area: 1, total: 100 }))
  const result = rankAreas(groups, 'priority', { a: 0, b: null, c: 5 })
  assert.deepEqual(result.map(row => [row.code, row.value]), [['c', 5], ['a', 0]])
})

test('Central priority uses class 9 and duration shares use evidence pixels', () => {
  const rows = parseBivariate(read('bivariate_legend_C.json'))
  const summary = summarizeEvidence(rows)
  assert.equal(summary.priority, 31674.38)
  assert.equal(summary.pixels, 434978)
  assert.ok(Math.abs(summary.durationShares[2] - 86689 / 434978 * 100) < 1e-9)
  assert.ok(Math.abs(summary.durationShares.reduce((a, b) => a + b, 0) - 100) < 1e-9)
  // This subset is deliberately smaller than the Type export's 437,164 pixels.
  assert.notEqual(summary.pixels, 437164)
})

test('national, regional and provincial grouping preserves detected area', () => {
  assert.equal(groupAreas(features, 'region').length, 6)
  assert.equal(groupAreas(features, 'province').length, 77)
  const provinces = groupAreas(features.filter(f => f.properties.Region === 'C'), 'province')
  assert.equal(provinces.length, 22)
  assert.ok(Math.abs(provinces.reduce((sum, row) => sum + row.area, 0) - 245904.75) < 0.2)
  const districts = groupAreas(features.filter(f => f.properties.PROV_CODE === 14), 'district')
  assert.equal(districts.length, 16)
  const district = features.filter(f => f.properties.PROV_CODE === 14 && f.properties.AMP_CODE === '07')
  assert.equal(groupAreas(district, 'district').length, 1)
})

test('all existing evidence exports validate; incomplete data is not silently treated as zero', () => {
  const root = new URL('../../public/data/', import.meta.url)
  const files = readdirSync(root, { recursive: true }).filter(path => path.includes('bivariate') && path.endsWith('.json') && !path.includes('province_bivariate'))
  for (const file of files) assert.equal(parseBivariate(read(file)).length, 9, file)
  assert.equal(files.length, 255)
  assert.throws(() => parseBivariate([]))
  assert.throws(() => parseBivariate([{ class_id: 9, pixel_count: 1, area_rai: 1 }]))
  const invalid = read('bivariate_legend_C.json')
  invalid[0].pixel_count = -1
  assert.throws(() => parseBivariate(invalid))
})

test('zero-evidence exports distinguish zero area from undefined duration share', () => {
  const rows = Array.from({ length: 9 }, (_, i) => ({ class_id: i + 1, area_rai: 0, pixel_count: 0 }))
  const summary = summarizeEvidence(parseBivariate(rows))
  assert.equal(summary.priority, 0)
  assert.deepEqual(summary.durationShares, [null, null, null])
})
