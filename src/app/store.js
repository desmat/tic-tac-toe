import { configureStore } from '@reduxjs/toolkit'
import gameReducer from '../features/tic-tac-toe/gameSlice'

export const store = configureStore({
  reducer: {
    game: gameReducer,
  },
})
