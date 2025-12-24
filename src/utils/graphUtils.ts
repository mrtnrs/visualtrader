import type { Edge, Node } from '@xyflow/react'

export function connectedComponent(nodeId: string, nodes: Node[], edges: Edge[]): Set<string> {
  const present = new Set(nodes.map((n) => n.id))
  const adj = new Map<string, Set<string>>()

  const add = (a: string, b: string) => {
    if (!present.has(a) || !present.has(b)) {
      return
    }
    const s = adj.get(a) ?? new Set<string>()
    s.add(b)
    adj.set(a, s)
  }

  for (const e of edges) {
    add(e.source, e.target)
    add(e.target, e.source)
  }

  const out = new Set<string>()
  const q: string[] = [nodeId]

  while (q.length) {
    const cur = q.pop()!
    if (out.has(cur)) {
      continue
    }
    out.add(cur)

    const next = adj.get(cur)
    if (!next) {
      continue
    }

    for (const n of next) {
      if (!out.has(n)) {
        q.push(n)
      }
    }
  }

  return out
}
