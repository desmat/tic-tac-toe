import { checkDraw } from './gameSlice'

/* super dumb bot that'll just pick a free square by random */
export const nextMove = (grid) => {
  console.log('nextMove', grid)
  if (!grid) return []

  const freeSquares = grid.flat().filter((square) => !square.marked)
  if (freeSquares.length > 0) {
    const square = freeSquares[Math.floor(Math.random() * freeSquares.length)]
    return { row: square.row, col: square.col }
  }
}



const _checkWin = (squares, mark) => {
  if (squares.filter(({ marked }) => marked === mark).length === 3) {
    squares.forEach((square) => square.win = true)
    return true
  }
}

const checkWin = (grid, turn) => {
  // console.log('checkWin', { grid, turn })
  if (!turn) {
    return checkWin(grid, 'x') || checkWin(grid, 'o')
  }

  if (_checkWin(grid[0], turn) ||
      _checkWin(grid[1], turn) ||
      _checkWin(grid[2], turn) ||
      _checkWin([grid[0][0], grid[1][0], grid[2][0]], turn) ||
      _checkWin([grid[0][1], grid[1][1], grid[2][1]], turn) ||
      _checkWin([grid[0][2], grid[1][2], grid[2][2]], turn) ||
      _checkWin([grid[0][0], grid[1][1], grid[2][2]], turn) ||
      _checkWin([grid[0][2], grid[1][1], grid[2][0]], turn)) {
    // console.log('WIN!!!', turn, grid)    
    return turn  
  }
}



const cloneGrid = (grid) => {
  const clonedGrid = [
    [{}, {}, {}],
    [{}, {}, {}],
    [{}, {}, {}],
  ]
  grid.forEach((gridRow, i) => {
    gridRow.forEach((gridCell, j) => {
      clonedGrid[i][j] = { ...gridCell }
    })
  })

  return clonedGrid
}

const calcMoves = (games, grid, moves, depth = 0) => {
  let turn = (moves.length + 1) % 2 ? 'o' : 'x'

  // console.log('calcMoves', depth, grid, moves)

  if (depth > 200) {
    // console.log('DEPTH ERROR') 
    return games
  }

  if (checkWin(grid)) {
    // console.log('its-a-win-a', { turn, move: moves[moves.length-1] })
    games.win[turn].push(moves)
    return games
  }

  if (checkDraw(grid)) {
    // console.log('its-a-draw-a', { turn, move: moves[moves.length-1] })
    games.draw.push(moves)
    return games
  }

  turn = turn === 'x' ? 'o' : 'x' // next (speculative) turn
  grid.forEach((gridRow, i) => {
    gridRow.forEach((gridCell, j) => {
      if (!gridCell.marked) {
        const clonedGrid = cloneGrid(grid)
        clonedGrid[i][j].marked = turn
        calcMoves(games, clonedGrid, [...moves, (i * 3 + j)], depth++)
      }
    })
  })

    // console.log('winTurn', { winTurn, moves, games })
   return games

}

export const bestMove = (grid, moves) => {
  console.log('bestMove', { grid, moves })

  var games = {
    win: {
      x: [],
      o: [],
    }, 
    draw: []    
  }
  
  // grid = [
  //   [{}, {}, {}],
  //   [{}, {}, {}],
  //   [{}, {}, {}],
  // ]
  // moves = []

  // grid[0][0].marked = 'x'
  // moves.push(0)
  // grid[1][0].marked = 'o'
  // moves.push(3)
  // grid[0][1].marked = 'x'
  // moves.push(1)
  // grid[2][0].marked = 'o'
  // moves.push(6)
  // grid[0][2].marked = 'x'
  // moves.push(2)

  // grid[0][0].marked = 'x'
  // moves.push(0)
  // grid[1][1].marked = 'o'
  // moves.push(4)
  // grid[2][2].marked = 'x'
  // moves.push(8)
  // grid[0][1].marked = '0'
  // moves.push(1)



  // // special cases: first move (random for more fun) otherwise go for the corners
  if (moves.length === 0) {
    return nextMove(grid)
  // } else if (moves.length === 1 && [0, 2, 6, 8].includes(moves[0])) {
  //   // block the center!
  //   console.log('block the center!')
  //   return { row: 1, col: 1 }
  // } else if (moves.length === 1 && moves[0] === 4) {
  //   console.log('block the corners!')
  //   return { row: 0, col: 0 }
  }

  const turn = moves.length % 2 ? 'o' : 'x'
  const opponentTurn = moves.length % 2 ? 'x' : 'o'

  calcMoves(games, grid, moves)
  window.games = games
  games.win.x.sort((a, b) => a.length - b.length)
  games.win.o.sort((a, b) => a.length - b.length)
  games.draw.sort((a, b) => a.length - b.length)
  
  console.log('games', turn, games)

  let shortestWinMoves = games.win[turn].length > 0 ? games.win[turn][0].length : 0
  let bestOffensiveMoves = new Set(games.win[turn].filter((l) => l.length === shortestWinMoves).map((l) => l[moves.length]))

  let shortestLoseMoves = games.win[opponentTurn].length > 0 ? games.win[opponentTurn][0].length : 0
  let bestDefensiveMoves = new Set(games.win[opponentTurn].filter((l) => l.length  === shortestLoseMoves).map((l) => l[moves.length + 1]))

  let bestMoves = [...bestDefensiveMoves].filter((i) => bestOffensiveMoves.has(i)).sort()
  bestOffensiveMoves = [...bestOffensiveMoves].sort()
  bestDefensiveMoves = [...bestDefensiveMoves].sort()

  console.log('STATS', { shortestWinMoves, bestOffensiveMoves, shortestLoseMoves, bestDefensiveMoves, bestMoves })
  
  const weightedBestMoves = bestMoves.map((x) => {
    const offensive = games.win[turn].filter((y) => y[moves.length] === x).length
    const defensive = games.win[opponentTurn].filter((y) => y[moves.length + 1] === x).length
    const draw = games.draw.filter((y) => y[moves.length] === x).length
    return { move: x, weight: offensive + defensive, offensive, defensive, draw }
  }).sort((a, b) => b.weight - a.weight)
  
  console.log('BEST WEIGHTED MOVES', weightedBestMoves)

  let move 

  if (bestOffensiveMoves.length === 1) {
    // kill kill kill 
    move = bestOffensiveMoves[0]
    console.log('Next KILL move', move)
  } else if (weightedBestMoves.length > 0) {
    move = move = weightedBestMoves[0].move
    console.log('Next BEST move', move)
  } else if (bestDefensiveMoves.length > 0) {
    // const nextGame = Math.floor(Math.random() * games.win[opponentTurn].length)
    // const nextGame = 0 // shortest
    // move = games.win[opponentTurn][nextGame][moves.length + 1]
    move = bestDefensiveMoves[Math.floor(Math.random() * bestDefensiveMoves.length)]
    console.log('Next DEFENSIVE move', move)
  } else if (bestOffensiveMoves.length > 0) {
    // const nextGame = Math.floor(Math.random() * games.win[turn].length)
    // const nextGame = 0 // shortest
    // move = games.win[turn][nextGame][moves.length]
    move = bestOffensiveMoves[Math.floor(Math.random() * bestOffensiveMoves.length)]
    console.log('Next WINNING move', move)
  // } else if (games.draw.length > 0) {
  //   const nextGame = Math.floor(Math.random() * games.draw.length) // any of them
  //   move = games.draw[nextGame][moves.length]
  //   console.log('Next DRAW move', move)
  } else {
    return nextMove(grid)
  }

  return { row: Math.floor(move / 3), col: Math.floor(move % 3)}
}

window.bestMove = bestMove

/*
[x][ ][ ]
[ ][o][ ]
[ ][ ][x]

From Player O's POV:

    0
      4
        8
D         1
            7
              6
                2
                  3
                    5
                  5
                    3
L         2
            6
              7
            7
              6            
D         3  
            5
              2
                6
                  1
                  7    
D         5
            3
              6
                2
                  1
                  7
L         6
            2
              1
                5
              5
                1
D         7

			



    0
      4
        8
          1
            2 o1, d2, x2
              3 x1, o1
                5 x
                6 o
                  5 o
                  7 o
                7 x
                  5 x
                    6 x
                  6 x
                    5 x
              5 o1, d2
                3
                  6 d
                  7 o
                6 o
                  3 o
                  7 o
                7
                  3 o
                  6 d
              6 x1, d2
                3 
                  5 d
                  7 o
                5 x
                7 
                  3 x
                    5 x
                  5 d
                    3 d  
                
              7 o0


            3
            5
            6
            7






*/