// GitHub Actions cron 주기(4분)에 맞춰 TTL 설정.
// /api/slots/all (cron) 과 /api/slots/[id] (브라우저) 가 같은 캐시를 공유.
// cron이 캐시를 채우면 브라우저는 외부 요청 없이 캐시만 읽음.
export const TTL_MS = 4 * 60 * 1000

const cache = {}  // { [themeId]: { data, cachedAt } }

export function getCached(themeId) {
  const entry = cache[themeId]
  if (entry && Date.now() - entry.cachedAt < TTL_MS) return entry.data
  return null
}

export function setCached(themeId, data) {
  cache[themeId] = { data, cachedAt: Date.now() }
}
