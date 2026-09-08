export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length === 0) return []
  const headers = lines[0].split(',')
  return lines.slice(1).map((line) => {
    const cells = line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? ''
    })
    return row
  })
}

export function num(v: string | undefined): number {
  if (v === undefined || v === '') return NaN
  return Number(v)
}
