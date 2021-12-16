import { configureStore } from '@reduxjs/toolkit'
import gameReducer from '../features/tic-tac-toe/gameSlice'

export const store = configureStore({
  reducer: {
    game: gameReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.onWin', 'payload.onDraw'],
      },
    }),  
})
