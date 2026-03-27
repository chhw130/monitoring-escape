const GH_TOKEN = process.env.GH_PAT
const GH_REPO  = process.env.GH_REPO
const API_BASE = `https://api.github.com/repos/${GH_REPO}/actions/variables`

const GH_HEADERS = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
}

const VARIABLE_NAMES = ['NOTIFY_DAY_MIN', 'NOTIFY_THEMES', 'NOTIFY_THEME_SETTINGS']
const DEFAULTS = { NOTIFY_DAY_MIN: '0,17,17,17,17,17,0', NOTIFY_THEMES: 'tutu,ayako,goerok', NOTIFY_THEME_SETTINGS: '{}' }

export async function GET() {
  const result = { ...DEFAULTS }
  await Promise.all(
    VARIABLE_NAMES.map(async (name) => {
      const res = await fetch(`${API_BASE}/${name}`, { headers: GH_HEADERS })
      if (res.ok) {
        const data = await res.json()
        result[name] = data.value
      }
    })
  )
  return Response.json(result)
}

export async function POST(req) {
  const body = await req.json()

  await Promise.all(
    Object.entries(body).map(async ([name, value]) => {
      // 먼저 PATCH 시도, 없으면 POST로 생성
      const patchRes = await fetch(`${API_BASE}/${name}`, {
        method: 'PATCH',
        headers: GH_HEADERS,
        body: JSON.stringify({ name, value: String(value) }),
      })
      if (patchRes.status === 404) {
        await fetch(API_BASE, {
          method: 'POST',
          headers: GH_HEADERS,
          body: JSON.stringify({ name, value: String(value) }),
        })
      }
    })
  )

  return Response.json({ ok: true })
}
