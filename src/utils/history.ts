/**
 * Generic undo/redo history manager.
 * Stores deep-cloned snapshots of state. Max 50 entries.
 */

const MAX_HISTORY = 50

export interface HistoryManager<T> {
  push: (state: T) => void
  undo: () => T | null
  redo: () => T | null
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
}

export function createHistory<T>(initial: T): HistoryManager<T> {
  const stack: T[] = [structuredClone(initial)]
  let index = 0

  return {
    push(state: T) {
      // Remove any future states (we branched)
      stack.splice(index + 1)
      stack.push(structuredClone(state))
      if (stack.length > MAX_HISTORY) {
        stack.shift()
      } else {
        index++
      }
    },

    undo(): T | null {
      if (index <= 0) return null
      index--
      return structuredClone(stack[index])
    },

    redo(): T | null {
      if (index >= stack.length - 1) return null
      index++
      return structuredClone(stack[index])
    },

    canUndo() {
      return index > 0
    },

    canRedo() {
      return index < stack.length - 1
    },

    clear() {
      const current = stack[index]
      stack.length = 0
      stack.push(current)
      index = 0
    },
  }
}
