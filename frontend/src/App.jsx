import { useEffect, useState } from 'react'

export default function App() {
  const [out, setOut] = useState('loading...')

  useEffect(() => {
    fetch('/api/v1/auth/me/').then(async (r) =>
      setOut(`${r.status} ${JSON.stringify(await r.json())}`)
    )
  }, [])

  return <pre className="p-6 text-sm whitespace-pre-wrap">{out}</pre>
}