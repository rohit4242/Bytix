import { create } from "zustand"

interface ViewState {
    selectedUserId: string | null
    setSelectedUserId: (userId: string | null) => void
    clearViewContext: () => void
}

/**
 * Global store for managing the "Viewing Context" (the user currently being viewed/managed).
 * This allows various components across the platform to perform actions scoped to this user.
 */
export const useViewStore = create<ViewState>((set) => ({
    selectedUserId: null,
    setSelectedUserId: (userId) => set({ selectedUserId: userId }),
    clearViewContext: () => set({ selectedUserId: null }),
}))
