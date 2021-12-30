import { createSlice } from '@reduxjs/toolkit'

export const [MARK_X, MARK_O] = ['x', 'o']

export const [STATUS_INIT, STATUS_DEMO, STATUS_PLAYING, STATUS_WIN, STATUS_DRAW, STATUS_ABORTED] = ['INIT', 'DEMO', 'PLAYING', 'WIN', 'DRAW', 'ABORTED']

export const [PLAY_MODE_LOCAL, PLAY_MODE_X_VS_BOT, PLAY_MODE_O_VS_BOT, PLAY_MODE_BOT_VS_BOT, PLAY_MODE_DEMO, PLAY_MODE_X_VS_REMOTE, PLAY_MODE_O_VS_REMOTE] = ['LOCAL', 'X_VS_BOT', 'O_VS_BOT', 'BOT_VS_BOT', 'DEMO', 'X_VS_REMOTE', 'O_VS_REMOTE']

const initialState = {
  mode: PLAY_MODE_DEMO,
  status: STATUS_INIT,
  grid: [
    [{}, {}, {}],
    [{}, {}, {}],
    [{}, {}, {}],
  ],
  moves: [],
}

const _checkWin = (squares, mark) => {
  if (squares.filter(({ marked }) => marked === mark).length === 3) {
    squares.forEach((square) => square.win = true)
    return true
  }
}

const checkWin = (grid, turn) => {
  return _checkWin(grid[0], turn) ||
         _checkWin(grid[1], turn) ||
         _checkWin(grid[2], turn) ||
         _checkWin([grid[0][0], grid[1][0], grid[2][0]], turn) ||
         _checkWin([grid[0][1], grid[1][1], grid[2][1]], turn) ||
         _checkWin([grid[0][2], grid[1][2], grid[2][2]], turn) ||
         _checkWin([grid[0][0], grid[1][1], grid[2][2]], turn) ||
         _checkWin([grid[0][2], grid[1][1], grid[2][0]], turn)
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
      return {
        ...state, 
        ...action.payload
      }
    },
    reset: (state, action) => {      
      state.mode = (action && action.payload && action.payload.mode) || state.mode // keep same as last game unless otherwise specified
      state.remoteGameId = (action && action.payload && action.payload.remoteGameId) || initialState.remoteGameId
      state.status = initialState.status
      state.grid = initialState.grid
      state.moves = initialState.moves
    },
    mark: (state, action) => {
      const { row, col } = action.payload
      const { grid } = state
      const turn = selectTurn({ game: state })
      // console.log('game reducer mark', { state, action, mode, turn, grid })
      const square = grid[row][col]

      if (markSquare(square, turn)) {
        state.moves.push(row * 3 + col)
        const gotDraw = checkDraw(grid)
        const gotWin = checkWin(grid, turn)
        
        if (gotWin) {
          state.status = STATUS_WIN
        } else if (gotDraw) {
          state.status = STATUS_DRAW
        } else {
          state.status = STATUS_PLAYING
        }
      }
    }
  }
})

export const { mark, reset, set } = gameSlice.actions

export const selectGridData = (state) => state.game.grid

export const selectTurn = (state) => state.game.moves && state.game.moves.length && state.game.moves.length % 2 ? MARK_O : MARK_X

export const selectMode = (state) => state.game.mode

export const selectStatus = (state) => state.game.status

export const selectMoves = (state) => state.game.moves

export const selectRemoteGameId = (state) => state.game.remoteGameId

export default gameSlice.reducer
