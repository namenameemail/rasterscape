#!/usr/bin/env node
/**
 * Summarize Chrome CDP Profiler.stop profile JSON (CPU sampling).
 * Usage: node scripts/summarizeCdpProfile.mjs profiling/cdp-latest.json [topN=30]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const path = resolve(process.argv[2] ?? 'profiling/cdp-latest.json')
const topN = Number(process.argv[3] ?? 30)

const raw = JSON.parse(readFileSync(path, 'utf8'))
const profile = raw.profile ?? raw.result?.profile ?? raw

if (!profile?.nodes || !profile?.samples) {
  console.error('no profile.nodes/samples in', path)
  process.exit(1)
}

const nodes = new Map()
for (const n of profile.nodes) {
  nodes.set(n.id, n)
}

const selfHits = new Map()
const totalHits = new Map()

const bump = (map, id, v = 1) => map.set(id, (map.get(id) ?? 0) + v)

for (const sampleId of profile.samples) {
  bump(selfHits, sampleId)
  let id = sampleId
  const seen = new Set()
  while (id != null && !seen.has(id)) {
    seen.add(id)
    bump(totalHits, id)
    id = nodes.get(id)?.parent
  }
}

const intervalUs = profile.samples.length > 1 && profile.timeDeltas?.length
  ? profile.timeDeltas.reduce((a, b) => a + b, 0) / profile.timeDeltas.length
  : (profile.startTime != null && profile.endTime != null
    ? (profile.endTime - profile.startTime) / Math.max(1, profile.samples.length - 1)
    : 100)

const sampleMs = intervalUs / 1000
const wallMs = profile.startTime != null && profile.endTime != null
  ? (profile.endTime - profile.startTime) / 1000
  : profile.samples.length * sampleMs

const callFrameKey = (cf) => {
  const fn = cf.functionName || '(anonymous)'
  const url = (cf.url || '').replace(/^.*\/src\//, 'src/')
  const line = cf.lineNumber != null ? cf.lineNumber + 1 : '?'
  return `${fn} @ ${url}:${line}`
}

const rows = []
for (const [id, hits] of selfHits) {
  const node = nodes.get(id)
  if (!node?.callFrame) continue
  const key = callFrameKey(node.callFrame)
  const selfMs = hits * sampleMs
  const totalMs = (totalHits.get(id) ?? 0) * sampleMs
  rows.push({ key, selfMs, totalMs, hits })
}

rows.sort((a, b) => b.selfMs - a.selfMs)

const ours = rows.filter(r => r.key.includes('src/'))
const idleLike = /idle|program|garbage.?collect|compile|parse/i

console.log(`file: ${path}`)
console.log(`wallMs≈${wallMs.toFixed(1)} samples=${profile.samples.length} avgSampleMs≈${sampleMs.toFixed(3)}`)
console.log(`\n=== top ${topN} self (all) ===`)
for (const r of rows.slice(0, topN)) {
  console.log(`${r.selfMs.toFixed(1).padStart(7)}ms self  ${r.totalMs.toFixed(1).padStart(7)}ms tot  ${r.key}`)
}
console.log(`\n=== top ${Math.min(topN, ours.length)} self (src/) ===`)
for (const r of ours.slice(0, topN)) {
  console.log(`${r.selfMs.toFixed(1).padStart(7)}ms self  ${r.totalMs.toFixed(1).padStart(7)}ms tot  ${r.key}`)
}

const gcish = rows.filter(r => idleLike.test(r.key)).slice(0, 10)
if (gcish.length) {
  console.log('\n=== idle/gc/compile-ish ===')
  for (const r of gcish) {
    console.log(`${r.selfMs.toFixed(1).padStart(7)}ms self  ${r.key}`)
  }
}
