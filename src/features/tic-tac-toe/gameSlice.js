import { createSlice } from '@reduxjs/toolkit'

export const [MARK_X, MARK_O] = ['x', 'o']

export const [STATUS_INIT, STATUS_DEMO, STATUS_WAITING, STATUS_PLAYING, STATUS_WIN, STATUS_DRAW, STATUS_ABORTED, STATUS_ERROR] = ['INIT', 'DEMO', 'WAITING', 'PLAYING', 'WIN', 'DRAW', 'ABORTED', 'ERROR']

export const [PLAY_MODE_LOCAL, PLAY_MODE_X_VS_BOT, PLAY_MODE_O_VS_BOT, PLAY_MODE_BOT_VS_BOT, PLAY_MODE_DEMO, PLAY_MODE_X_VS_REMOTE, PLAY_MODE_O_VS_REMOTE] = ['LOCAL', 'X_VS_BOT', 'O_VS_BOT', 'BOT_VS_BOT', 'DEMO', 'X_VS_REMOTE', 'O_VS_REMOTE']

const initialState = {
  mode: PLAY_MODE_DEMO,
  status: STATUS_INIT,
  turn: MARK_X,
  grid: [
    [{}, {}, {}],
    [{}, {}, {}],
    [{}, {}, {}],
  ],
  moves: [],  
}

const checkWin = (squares, mark) => {
  if (squares.filter(({ marked }) => marked === mark).length === 3) {
    squares.forEach((square) => square.win = true)
    return true
  }
}

const checkDraw = (grid) => {
  return grid.flat().filter((square) => !square.marked).length === 0
}

const markSquare = (square, mark) => {
  if (!(typeof mark === 'undefined') && square && !square.marked) {
    square.marked = mark
    return true
  }
}

export const gameSlice = createSlice({
  name: 'game',
  initialState: {
    ...initialState, 
    // init grid with each square's row and col for easier processing
    grid: initialState.grid.map((rowData, row) => rowData.map((cell, col) => { cell.row = row; cell.col = col; return cell}))
  },
  reducers: {
    set: (state, action) => {
      // console.log('gameSlice set', action.payload)
      return {
        ...state, 
        ...action.payload
      }
    },
    reset: (state, action) => {      
      // console.log('gameSlice reset', action.payload)
      return {
        ...initialState,
        ...action.payload,
        mode: (action && action.payload && action.payload.mode) || state.mode, // keep same as last game unless otherwise specified
      }
    },
    mark: (state, action) => {
      const { row, col } = action.payload
      const { grid, turn } = state
      // console.log('gameSlice mark', { state, action, mode, turn, grid })
      const square = grid[row][col]

      if (markSquare(square, turn)) {
        state.moves.push(row * 3 + col)
        const gotDraw = checkDraw(grid)
        const gotWin = checkWin(grid[row], turn) ||
                       checkWin([grid[0][col], grid[1][col], grid[2][col]], turn) ||
                       checkWin([grid[0][0], grid[1][1], grid[2][2]], turn) ||
                       checkWin([grid[0][2], grid[1][1], grid[2][0]], turn)
        
        if (gotWin) {
          state.status = STATUS_WIN
        } else if (gotDraw) {
          state.status = STATUS_DRAW
        } else {
          state.status = STATUS_PLAYING
          state.turn = turn === MARK_X ? MARK_O : MARK_X
        }
      }
    }
  }
})

export const { mark, reset, set } = gameSlice.actions

export const selectGridData = (state) => state.game.grid

export const selectTurn = (state) => state.game.turn

export const selectMode = (state) => state.game.mode

export const selectStatus = (state) => state.game.status

export const selectMoves = (state) => state.game.moves

export const selectGameId = (state) => state.game.gameId

export const selectGameToJoin = (state) => state.game.gameToJoin

export const selectGameToCleanup = (state) => state.game.gameToCleanup

export default gameSlice.reducer
