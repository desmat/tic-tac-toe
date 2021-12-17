import { createSlice } from '@reduxjs/toolkit'

export const [MARK_X, MARK_O] = ['x', 'o']

export const [STATUS_INIT, STATUS_DEMO, STATUS_PLAYING, STATUS_WIN, STATUS_DRAW] = ['INIT', 'DEMO', 'PLAYING', 'WIN', 'DRAW']

export const [PLAY_MODE_LOCAL, PLAY_MODE_X_VS_BOT, PLAY_MODE_O_VS_BOT, PLAY_MODE_BOT_VS_BOT, PLAY_MODE_DEMO] = ['LOCAL', 'X_VS_BOT', 'O_VS_BOT', 'BOT_VS_BOT', 'DEMO']

const initialState = {
  mode: PLAY_MODE_DEMO,
  status: STATUS_INIT,
  turn: MARK_X,
  grid: [
    [{}, {}, {}],
    [{}, {}, {}],
    [{}, {}, {}],
  ],
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

const findFreeSquare = (grid) => {
  // console.log('findFreeSquare', grid)
  if (!grid) return []

  const freeSquares = grid.flat().filter((square) => !square.marked)
  if (freeSquares.length > 0) {
    const square = freeSquares[Math.floor(Math.random() * freeSquares.length)]
    return [square.row, square.col]
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
    reset: (state, action) => {      
      state.mode = (action && action.payload && action.payload.mode) || state.mode // keep same as last game unless otherwise specified
      state.turn = initialState.turn
      state.status = initialState.status
      state.grid = initialState.grid
    },
    mark: (state, action) => {
      const { bot } = action.payload
      const { grid, mode, turn } = state
      // console.log('game reducer mark', { state, action, mode, turn, grid })

      if (bot && mode === PLAY_MODE_LOCAL) {
        console.error('game reducer mark: invalid mode for bot action', { mode, action })
        return
      }

      // if bot here then pick the square else select 
      const [row, col] = bot ? findFreeSquare(grid) : [action.payload.row, action.payload.col]
      const square = grid[row][col]

      if (markSquare(square, turn)) {
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

export const { mark, reset } = gameSlice.actions

export const selectGridData = (state) => state.game.grid

export const selectTurn = (state) => state.game.turn

export const selectMode = (state) => state.game.mode

export const selectStatus = (state) => state.game.status

export default gameSlice.reducer
