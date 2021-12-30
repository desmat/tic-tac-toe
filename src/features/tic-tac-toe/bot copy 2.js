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

const calcMoves = (games, grid, moves, depth = 0, childrenMoves) => {
  // if (!['0,4,8', '0,4,8,1', '0,4,8,2'].includes(moves.slice(0, 4).toString())) return
  // console.log('XXX MOVES XXX', moves.toString())


  const turn = (moves.length + 1) % 2 ? 'o' : 'x'
  const opponentTurn = moves.length % 2 ? 'x' : 'o'
  const move = moves && moves.length > 0 && moves[moves.length - 1]
  const childMove = {
    move,
    // outcome: undefined,
    children: []
  }
  if (!childrenMoves) childrenMoves = games.tree
  childrenMoves.push(childMove)

  // console.log('calcMoves', { depth, turn, move, moves })

  if (depth > 9) {
    console.log('DEPTH ERROR') 
    return games
  }

  if (checkWin(grid)) {
    // console.log('move has a win', { turn, move, moves })
    // games.win[turn].push(moves)
    childMove.outcome = turn
    childMove.outcomes = { ...(childMove.outcomes || {}), [turn]: 0 }
    return games
  }

  if (checkDraw(grid)) {
    // console.log('move has a draw', { turn, move, moves })
    // games.draw.push(moves)
    childMove.outcome = 'd'
    childMove.outcomes = { ...(childMove.outcomes || {}), d: 0 }
    return games
  }

  const nextTurn = turn === 'x' ? 'o' : 'x' // next (speculative) turn
  grid.forEach((gridRow, i) => {
    gridRow.forEach((gridCell, j) => {
      if (!gridCell.marked) {
        const clonedGrid = cloneGrid(grid)
        clonedGrid[i][j].marked = nextTurn
        calcMoves(games, clonedGrid, [...moves, (i * 3 + j)], depth + 1, childMove.children)        
      }
    })
  })

  // console.log('YYY MOVES YYY', moves.toString())


  // trim out useless moves
  // const winningMoves = childMove.children.filter((m) => m.outcomes && m.outcomes[nextTurn] === 0)
  // if (winningMoves.length > 0 && winningMoves.length !== childMove.children.length) {
  //   console.log('triming out dumb moves', { turn, moves: childMove.children, winningMoves })
  //   childMove.children = winningMoves
  // } else if (winningMoves.length > 0 && winningMoves.length === childMove.children.length) {
  //   // console.log('ALL MOVES ARE WINNING MOVES: LOCKED IN', { turn, moves: childMove.children, winningMoves })
  //   // TODO somehow propagate this up
  // }

  // don't even consider moves where the next is a guaranteed win to the opponent
  // const opponentWinningMoves = childMove.children.filter((m) => m.outcomes && m.outcomes[turn] === 1).map((m) => m.move)
  // if (opponentWinningMoves.length > 0) {
  //   console.log('opponent winning moves AHEAD', { turn, move, moves, childrenMoves: childMove.children, opponentWinningMoves })
  //   childMove.children = childMove.children.filter((m) => !opponentWinningMoves.includes(m.move))
  //   // console.log('children after filtering', { childrenMoves: childMove.children })

  //   // TODO somehow propagate this up
  // }


  // check children moves here and propagate outcomes up
  const numChildren = childMove.children.length
  const xOutcomes = childMove.children.filter((m) => m.outcomes && m.outcomes.x >= 0).map((m) => m.outcomes.x)
  const oOutcomes = childMove.children.filter((m) => m.outcomes && m.outcomes.o >= 0).map((m) => m.outcomes.o)
  const dOutcomes = childMove.children.filter((m) => m.outcomes && m.outcomes.d >= 0).map((m) => m.outcomes.d)

  // guaranteed outcomes
  const gxOutcomes = childMove.children.filter((m) => m.outcomes && m.outcomes.gx >= 0).map((m) => m.outcomes.gx)
  const goOutcomes = childMove.children.filter((m) => m.outcomes && m.outcomes.go >= 0).map((m) => m.outcomes.go)

  // console.log('outcomes', { moves, numChildren, xOutcomes, gxOutcomes, oOutcomes, goOutcomes, dOutcomes })



  // descendants have a possible winning moves: roll up steps to wins
  if (xOutcomes.length > 0) {
    childMove.outcomes = { ...(childMove.outcomes || {}), x: Math.min(...xOutcomes) + 1 }
  }
  
  if (oOutcomes.length > 0) { 
    childMove.outcomes = { ...(childMove.outcomes || {}), o: Math.min(...oOutcomes) + 1 }
  }

  if (dOutcomes.length > 0) { 
    childMove.outcomes = { ...(childMove.outcomes || {}), d: Math.min(...dOutcomes) + 1 }
  }

  if (xOutcomes.filter((o) => o === 0).length > 0) {
    // console.log('guaranteed x outcome', moves.toString(), 'gx', 0, 'xOutcomes', xOutcomes.toString(), 'oOutcomes', oOutcomes.toString(), 'dOutcomes', dOutcomes.toString(), 'numChildren', numChildren)
    childMove.outcomes = { ...(childMove.outcomes || {}), gx: 1 }
  } else if ((gxOutcomes.length > 0 && gxOutcomes.length === numChildren) ||
      ((xOutcomes.length > 0 && oOutcomes.length === 0 && xOutcomes.length === numChildren))) {
    // console.log('guaranteed x outcomes', moves.toString(), 'gxOutcomes', gxOutcomes, 'xOutcomes', xOutcomes.toString(), 'oOutcomes', oOutcomes.toString(), 'dOutcomes', dOutcomes.toString(), 'numChildren', numChildren) 
    childMove.outcomes = { ...(childMove.outcomes || {}), gx: Math.min(...gxOutcomes) + 1 }
  }

  if (oOutcomes.filter((o) => o === 0).length > 0) {
    // console.log('guaranteed o outcome', moves.toString(), 'go', 0, 'xOutcomes', xOutcomes.toString(), 'oOutcomes', oOutcomes.toString(), 'dOutcomes', dOutcomes.toString(), 'numChildren', numChildren)
    childMove.outcomes = { ...(childMove.outcomes || {}), go: 1 }
  } else if ((goOutcomes.length > 0 && goOutcomes.length === numChildren) ||
      ((oOutcomes.length > 0 && oOutcomes.length === 0 && oOutcomes.length === numChildren))) {
    // console.log('guaranteed o outcomes', moves.toString(), 'goOutcomes', goOutcomes, 'xOutcomes', xOutcomes.toString(), 'oOutcomes', oOutcomes.toString(), 'dOutcomes', dOutcomes.toString(), 'numChildren', numChildren) 
    childMove.outcomes = { ...(childMove.outcomes || {}), go: Math.min(...goOutcomes) + 1 }
  }


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
    draw: [], 
    tree: [], 
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

  /*
  [x][o][ ]
  [ ][o][ ]
  [ ][ ][x]
  */

  // grid[0][0].marked = 'x'
  // moves.push(0)
  // grid[1][1].marked = 'o'
  // moves.push(4)
  // grid[2][2].marked = 'x'
  // moves.push(8)
  // grid[0][1].marked = '0'
  // moves.push(1)
  // grid[0][2].marked = 'x'
  // moves.push(2)
  // grid[1][0].marked = '0'
  // moves.push(3)

  // let workingChildren = games.tree
  // moves.forEach((m) => {
  //   let child = { move: m, children: [] }
  //   workingChildren.push(child)
  //   workingChildren = child.children
  // })


  // // special cases: first move (random for more fun) otherwise go for the corners
  if (moves.length === 0) {
    return nextMove(grid)
  } else if (moves.length === 1 && [0, 2, 6, 8].includes(moves[0])) {
    // block the center!
    // console.log('block the center!')
    return { row: 1, col: 1 }
  } else if (moves.length === 1 && moves[0] === 4) {
    // block the corner!
    // console.log('grab a corner!')
    return { row: Math.round(Math.random()) * 2, col: Math.round(Math.random()) * 2 }
  }

  const turn = moves.length % 2 ? 'o' : 'x'
  const opponentTurn = moves.length % 2 ? 'x' : 'o'

  calcMoves(games, grid, moves, undefined, games.tree)
  // window.games = games
  games.win.x.sort((a, b) => a.length - b.length)
  games.win.o.sort((a, b) => a.length - b.length)
  games.draw.sort((a, b) => a.length - b.length)
  
  console.log('games', turn, games)
  console.log('game tree', { turn, outcomes: games.tree[0].outcomes, moves: games.tree[0].children.map((c) => { return { move: c.move, outcomes: c.outcomes }}) })


  let bestMove

  if (games.tree && games.tree.length > 0) {
    const winningMoves = games.tree[0].children.filter((c) => c.outcomes && c.outcomes[turn] === 0)
    const blockingMoves = games.tree[0].children.filter((c) => c.outcomes && c.outcomes[opponentTurn] === 1).sort((a, b) => a.outcomes[turn] - b.outcomes[turn]).reverse()
    const leastWorseMoves = games.tree[0].children.filter((c) => !(c.outcomes && c.outcomes[opponentTurn] === 1))
    const sortedBestDrawMoves = leastWorseMoves // leastWorseMoves.sort((a, b) => (a.outcomes.d - a.outcomes[opponentTurn]) - (b.outcomes - b.outcomes[opponentTurn]))
    const sortedBestWinMoves = leastWorseMoves // leastWorseMoves.sort((a, b) => (a.outcomes[turn] - a.outcomes[opponentTurn]) - (b.outcomes[turn] - b.outcomes[opponentTurn]))

    // XXX THIS SHOULD BE THE ONE
    // const calcTurn = (i) => i % 2 ? 'o' : 'x'
    const calcOppositeTurn = (turn) => turn === 'x' ? 'o' : 'x'
    const calcWeight = (m, turn) => { 
      const oppositeTurn = calcOppositeTurn(turn)
      // console.log('calcWeight', { m, turn, m_outcomes_turn_: m.outcomes[turn], m_outcomes_oppositeTurn_: m.outcomes[oppositeTurn], m_outcomes_d: m.outcomes.d, })
      
      // // guaranteed win
      // if (m.outcomes && (m.outcomes[`g${oppositeTurn}`] > 0)) {
      //   console.log('guaranteed winning outcome', m.move, turn, m.outcomes[`g${oppositeTurn}`])
      //   return 888
      // }

      // possible winning outcome
      if (m.outcomes[oppositeTurn] === 0 || ((m.outcomes[oppositeTurn] > 0) && (m.outcomes[oppositeTurn] < (m.outcomes[turn] || 0)))) {
        // console.log('winning outcome')
        return (m.outcomes[turn] >= 0 ? m.outcomes[turn] * 10 : 0) -
            (m.outcomes[oppositeTurn] > 0 ? m.outcomes[oppositeTurn] * 10 : 100)
      }
      
      // no winning outcomes: least terrible move based on possible draw outcome (ie draw out the game)
      // console.log('no winning outcome')
      return 100 - ((m.outcomes[turn] || 0) * 10) - (m.outcomes.d || 0)
    }
    
    games.tree[0].children.forEach((m) => m.weight = calcWeight(m, calcOppositeTurn(turn))) // note that turn is actually last turn
    const sortedBestMoves = games.tree[0].children.sort((a, b) => a.weight - b.weight)
    // first find one of the best moves
    let sortedBestMove = sortedBestMoves && sortedBestMoves.length > 0 && sortedBestMoves[0] && sortedBestMoves[0].move >= 0 ? sortedBestMoves[0] : undefined
    sortedBestMove = sortedBestMove ? sortedBestMoves.filter((m) => m.weight === sortedBestMove.weight) : undefined
    sortedBestMove = sortedBestMove && sortedBestMove.length > 0 ? sortedBestMove[Math.floor(Math.random() * sortedBestMove.length)].move : undefined
    // then if we have equivalent best moves, chose one at random

    let guaranteedWinMoves = games.tree[0].children.filter((m) => m.outcomes && m.outcomes[`g${turn}`] >= 0)
    let guaranteedLoseMoves = games.tree[0].children.filter((m) => m.outcomes && m.outcomes[`g${opponentTurn}`] >= 0)
      
    // console.log('BEST', { blockingMoves, winningMoves, leastWorseMoves, sortedBestDrawMoves, sortedBestWinMoves, sortedBestMoves })
    console.log('GUARANTEED WIN', guaranteedWinMoves)
    console.log('GUARANTEED LOSE', guaranteedLoseMoves)
    console.log('BEST SORTED', sortedBestMoves)
    console.log('OTHERS', { blockingMoves })

    guaranteedWinMoves = guaranteedWinMoves.map((m) => m.move)
    guaranteedLoseMoves = guaranteedLoseMoves.map((m) => m.move)
    const notGuaranteedLoseMoves = sortedBestMoves.filter((m) => !guaranteedLoseMoves.includes(m.move)).map((m) => m.move)

    bestMove = 
      // guaranteedWinMoves.length > 0 ? guaranteedWinMoves[Math.floor(Math.random() * guaranteedWinMoves.length)] : 
      // winningMoves.length > 0 ? winningMoves[Math.floor(Math.random() * winningMoves.length)].move :
      // // sortedBestWinMoves.length > 0 && sortedBestDrawMoves.length > 0 && sortedBestWinMoves[0].outcomes[turn] <= sortedBestDrawMoves[0].outcomes.d ? sortedBestWinMoves[0].move :
      // sortedBestWinMoves.length > 0 ? sortedBestWinMoves[Math.floor(Math.random() * sortedBestWinMoves.length)].move :
      // // sortedBestDrawMoves.length > 0 ? sortedBestDrawMoves[Math.floor(Math.random() * sortedBestDrawMoves.length)].move : 
      // // assured loss here; might as well last as long as possible
      // blockingMoves.length > 0 ? blockingMoves[Math.floor(Math.random() * blockingMoves.length)].move : 
      // leastWorseMoves.length > 0 ? leastWorseMoves[Math.floor(Math.random() * leastWorseMoves.length)] :
      // undefined

      guaranteedWinMoves.length > 0 ? guaranteedWinMoves[Math.floor(Math.random() * guaranteedWinMoves.length)] : 
      notGuaranteedLoseMoves.length > 0 ? notGuaranteedLoseMoves[Math.floor(Math.random() * notGuaranteedLoseMoves.length)] : 
      // blocking move or least worse move?
      sortedBestMove


      console.log('BEST MOVE', { bestMove })

  }

  return (typeof bestMove !== 'undefined') ? { row: Math.floor(bestMove / 3), col: Math.floor(bestMove % 3)} : nextMove(grid)
}

window.bestMove = bestMove
// bestMove()

 



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

			


[x][o][ ]
[ ][o][ ]
[ ][ ][x]

    0
      4
        8
          1
            2 o1, d3, x2
              3 x1, o1
                5 x
                6 o1
                  5 o
                  7 o
                7 x2
              5 o2, d2
              6 x1, d2
              7 o0


            3 o1
            5 o1
            6 o1
            7 x2, o3, d4
              2 x1
                3 x2
                  5 x1
                    6 x
                5 x2
                  3 x1
                    6 x
                6 x
              3 x1, o2
                2 o1
                  5 o
                5 x1
                  6 x
                6 x
              5 x1, o2
                2 o1
                  3 o
                3 x2
                  2 x1
                    6 x
                6 x
              6 x3, o2, d3
                2 x2
                  3 x1
                    5 x
                3 o1, d2
                  2 o
                  5 d1
                    2 d
                5 o1, x2
                  2 o
                  6 x1
                    2 x
              



0
  4
    8
      6 // ASSURED X WIN
        2 // FORCED
          1
            5 X WINS
          5
            1 X WINS => collapse up as 0-move win





*/



