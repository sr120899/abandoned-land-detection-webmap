// Real Model Result values, sampled directly from the v3_20/v3_21 rasters at
// each point's coordinates (not the GEE-side featureBandList summary, which
// uses a different NBR-based yod that can disagree with the official raster —
// see Data_Notes caveat about nbr_yod vs v3_21 yod for point_5).
export const MODEL_RESULT: Record<
  string,
  {
    lat: number
    lon: number
    amphoe: string
    province: string
    provCode: string
    probability: number
    yod: number
    duration: number
    type: 'C1' | 'C2'
    nbrChangeYear: number
  }
> = {
  point_5: {
    lat: 14.303891, lon: 100.321088, amphoe: 'Bang Sai', province: 'Phra Nakhon Si Ayudhya', provCode: '14',
    probability: 50, yod: 2011, duration: 14, type: 'C2', nbrChangeYear: 2013,
  },
  point_4: {
    lat: 14.448408, lon: 100.580927, amphoe: 'Bang Pahan', province: 'Phra Nakhon Si Ayudhya', provCode: '14',
    probability: 98, yod: 2000, duration: 25, type: 'C1', nbrChangeYear: 2001,
  },
  point_1: {
    lat: 13.585415, lon: 100.676196, amphoe: 'Bang Phi', province: 'Samut Prakarn', provCode: '11',
    probability: 86, yod: 2000, duration: 25, type: 'C2', nbrChangeYear: 2013,
  },
}

