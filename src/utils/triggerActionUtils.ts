import type { TriggerAction, ActionConfig } from './strategyStorage'

/**
 * Find a trigger action by ID (recursive search through children)
 */
export function findTriggerAction(actions: TriggerAction[], id: string): TriggerAction | null {
    for (const a of actions) {
        if (a.id === id) {
            return a
        }
        if (Array.isArray(a.children) && a.children.length) {
            const hit = findTriggerAction(a.children, id)
            if (hit) {
                return hit
            }
        }
    }
    return null
}

/**
 * Update a trigger action's config by ID (recursive)
 */
export function updateTriggerActionConfig(actions: TriggerAction[], id: string, config: ActionConfig): TriggerAction[] {
    return actions.map((a) => {
        if (a.id === id) {
            return { ...a, config }
        }
        if (Array.isArray(a.children) && a.children.length) {
            return { ...a, children: updateTriggerActionConfig(a.children, id, config) }
        }
        return a
    })
}

/**
 * Remove a trigger action by ID (recursive)
 */
export function removeTriggerAction(actions: TriggerAction[], id: string): TriggerAction[] {
    const next: TriggerAction[] = []
    for (const a of actions) {
        if (a.id === id) {
            continue
        }
        if (Array.isArray(a.children) && a.children.length) {
            const nextChildren = removeTriggerAction(a.children, id)
            if (nextChildren !== a.children) {
                next.push({ ...a, children: nextChildren.length ? nextChildren : undefined })
            } else {
                next.push(a)
            }
        } else {
            next.push(a)
        }
    }
    return next
}

/**
 * Add a child action to a parent action by ID (recursive)
 */
export function addChildAction(actions: TriggerAction[], parentId: string, child: TriggerAction): TriggerAction[] {
    return actions.map((a) => {
        if (a.id === parentId) {
            const nextChildren = Array.isArray(a.children) ? a.children.concat(child) : [child]
            return { ...a, children: nextChildren }
        }
        if (Array.isArray(a.children) && a.children.length) {
            return { ...a, children: addChildAction(a.children, parentId, child) }
        }
        return a
    })
}
