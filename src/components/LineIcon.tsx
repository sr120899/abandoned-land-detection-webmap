const paths: Record<string, string> = {
  satellite: 'M9 9l6-6 6 6-6 6-6-6ZM5 2l4 4-4 4-4-4 4-4ZM18 14l4 4-4 4-4-4 4-4ZM7 8l3 3m3 3 3 3M9 15l-3 3M2 14a8 8 0 0 0 8 8M3 18a4 4 0 0 0 3 3',
  signal: 'M3 17l5-6 4 3 9-11M3 22h18M3 3v19',
  target: 'M20 12a8 8 0 1 1-8-8M16 12a4 4 0 1 1-4-4M12 12l9-9m-5 0h5v5',
  database: 'M21 5c0 2-4 3-9 3S3 7 3 5s4-3 9-3 9 1 9 3ZM3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0',
  code: 'M7 6l-5 6 5 6M17 6l5 6-5 6M14 3l-4 18',
  layers: 'M3 7 12 2 21 7 12 12 3 7ZM3 12l9 5 9-5M3 17l9 5 9-5',
  pin: 'M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0ZM12 7v5m-2-2h4',
  calendar: 'M5 5h14v16H5ZM8 2v6m8-6v6M5 10h14M8 13h1m3 0h1m3 0h1M8 17h1m3 0h1m3 0h1',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 6v6l4 3',
  grid: 'M3 3h4v4H3ZM10 3h4v4h-4ZM17 3h4v4h-4ZM3 10h4v4H3ZM10 10h4v4h-4ZM17 10h4v4h-4ZM3 17h4v4H3ZM10 17h4v4h-4ZM17 17h4v4h-4Z',
  chip: 'M6 6h12v12H6ZM9 9h6v6H9ZM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4',
  chart: 'M4 13h3v8H4ZM11 8h3v13h-3ZM18 3h3v18h-3Z',
  search: 'M14 21H4V3h15v9M7 7h8M7 11h5M20 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-1 3 3 3',
  person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 22v-5c0-5 18-5 18 0v5H3Z',
  people: 'M15 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6 21v-5c0-5 12-5 12 0v5H6ZM3 7a3 3 0 0 1 2 6M21 7a3 3 0 0 0-2 6M3 15l-2 2v3h3m17-5 2 2v3h-3',
  leaf: 'M12 22V11M12 16C2 17 2 7 2 7s10 0 10 9ZM12 11C12 2 22 2 22 2s0 10-10 9M12 20l6-5',
  pause: 'M8 4v16M16 4v16',
  tractor: 'M8 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM22 18a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 15V8h7l3 7M9 8V3h6v9M8 18h6M3 11h4',
  branch: 'M4 12h5c5 0 4-8 9-8h3m-4-3 4 3-4 3M9 12c5 0 4 8 9 8h3m-4-3 4 3-4 3',
  bulb: 'M8 17c0-3-4-4-4-9a8 8 0 0 1 16 0c0 5-4 6-4 9H8Zm0 3h8m-6 3h4',
  shield: 'M4 3l8-1 8 1v13l-8 6-8-6V3Zm4 8 3 3 5-6',
  arrow: 'M8 4l8 8-8 8',
  chevron: 'M6 9l6 6 6-6',
}

export default function LineIcon({ name }: { name: string }) {
  return <svg className="line-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.layers} /></svg>
}
