const ALL_MOVES = [0, 1, 2, 3, 4, 5, 6, 7, 8]

const WINNING_MOVES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]

const intToMoveObj = (moveInt) => {
  return { row: Math.floor(moveInt / 3), col: Math.floor(moveInt % 3)}
}

/* super dumb bot that'll just pick a free square by random */
export const nextMove = (moves) => {
  // console.log('nextMove', moves)
  
  const possibleMoves = ALL_MOVES.filter((m) => !moves.includes(m))
  if (possibleMoves.length > 0) {
    return intToMoveObj(possibleMoves[Math.floor(Math.random() * possibleMoves.length)])
  }
}

var hasWin = (moves) => {
  const _hasWin = (turnMoves) => WINNING_MOVES.map((win) => turnMoves.filter((m) => win.includes(m))).filter((win) => win.length === 3)
  const wins = 
    _hasWin(moves.map((m, i) => i % 2 ? -1 : m).filter((m) => m >= 0)) // all x moves
    .concat(_hasWin(moves.map((m, i) => i % 2 ? m : -1).filter((m) => m >= 0))) // all o moves
    .flat()

  if (wins.length > 0) return wins
}

const checkGuaranteedWin = (move, turn) => {
  // console.log('checkGuaranteedWin', 'moves', moves.toString(), 'turn:', turn, 'move', move.move, 'outcome:', move.outcomes ? JSON.stringify(move.outcomes) : '', 'numChildrenMoves:', move.moves.length)

  if (!turn) {
    return checkGuaranteedWin(checkGuaranteedWin(move, 'x'), 'o')
  }

  const opponentTurn = calcOppositeTurn(turn)

  if (move.outcomes[opponentTurn] === 1) {
    move.outcomes[`g${opponentTurn}`] = 0
  } else if (move.outcomes[`g${turn}`] === 1) {
    // check to see if every next outcomes lead to a win
    const childrenGuaranteedMoves = move.moves.filter((m) => m.outcomes[`g${turn}`] === 0)
    if (childrenGuaranteedMoves.length === move.moves.length) {
      move.outcomes[`g${turn}`] = 0
    }
  }

  return move
}

const rollUpOutcomes = (move, outcome) => {
  const outcomes = move.moves
    .filter((m) => m.outcomes && m.outcomes[outcome] >= 0)
    .map((m) => m.outcomes[outcome])

  if (outcomes.length > 0) {
    move.outcomes[outcome] = Math.min(...outcomes) + 1
  }
}

const calcOppositeTurn = (turn) => turn === 'x' ? 'o' : 'x'

// bigger weight is better move
const calcMoveWeight = (m) => { 
  // console.log('calcMoveWeight', { move: m.move, turn: m.turn, outcome: JSON.stringify(m.outcomes) })
  const turn = m.turn
  const oppositeTurn = calcOppositeTurn(turn)

  const guaranteedWinWeight = m.outcomes[`g${turn}`] >= 0 ? 100 * (10 - m.outcomes[`g${turn}`]) : 0
  const guaranteedLossWeight = m.outcomes[`g${oppositeTurn}`] >= 0 ? 100 * (10 - m.outcomes[`g${oppositeTurn}`]): 0
  const winWeight = m.outcomes[turn] >= 0 ? 10 * (10 - m.outcomes[turn]): 0
  const lossWeight = m.outcomes[oppositeTurn] >= 0 ? 10 * (10 - m.outcomes[oppositeTurn]) : 0
  const drawWeight = m.outcomes.d > 0 ? 10 - m.outcomes.d : 0
  // console.log('weights', JSON.stringify({ turn, move: m.move, guaranteedWinWeight, guaranteedLossWeight, winWeight, lossWeight, drawWeight}))

  // immediate win: absolute best move
  if (m.outcomes && (m.outcomes[turn] === 0)) {
    // console.log('winning outcome', m.move, turn, m.outcomes[`${turn}`])
    return Number.MAX_SAFE_INTEGER
  }
  
  // guaranteed loss: worst move, losing opponent should pick the least terrible move: ones with more draw outcomes
  if (m.outcomes && (m.outcomes[`g${oppositeTurn}`] === 0)) { // m.outcomes[oppositeTurn] === 0? or 1?
    // console.log('guaranteed losing outcome', m.move, turn, m.outcomes[`g${oppositeTurn}`])
    return drawWeight - guaranteedLossWeight
  }

  // guaranteed win: second best move (from a winning move)
  if (m.outcomes && (m.outcomes[`g${turn}`] === 0)) { 
    // console.log('guaranteed winning outcome', m.move, turn, m.outcomes[`g${oppositeTurn}`])
    return 1000
  }

  return guaranteedWinWeight + winWeight + drawWeight - guaranteedLossWeight - lossWeight
}

const calcMoves = (moves, depth) => {
  // console.log('calcMoves', moves, depth)
  const turn = moves.length % 2 ? 'x' : 'o'
  const move = moves && moves.length > 0 && moves[moves.length - 1]
  const calculatedMove = {
    turn,
    move,
    outcomes: {},
    moves: []
  }

  if (hasWin(moves)) {
    // console.log('move has a win', 'move:', moves.toString(), { turn, move, moves })
    calculatedMove.outcomes = { [turn]: 0 } // no other possible outcomes
    return calculatedMove
  }

  if (moves.length === 9) {
    // console.log('move has a draw', moves.toString(), { turn, move, moves })
    calculatedMove.outcomes = { d: 0 } // no other possible outcomes
    return calculatedMove
  }

  if (depth > 0) {
    ALL_MOVES.filter((m) => !moves.includes(m)).forEach((move) => {
      const nextMoves = [...moves, move]
      // console.log('calcMoves(nextMoves, depth + 1), ', nextMoves, depth)
      calculatedMove.moves.push(
        checkGuaranteedWin(
          calcMoves(nextMoves, depth - 1)))
    })
  }

  // roll up possible (steps to win, draw, guaranteed win)
  rollUpOutcomes(calculatedMove, 'x')
  rollUpOutcomes(calculatedMove, 'o')
  rollUpOutcomes(calculatedMove, 'd')
  rollUpOutcomes(calculatedMove, 'gx')
  rollUpOutcomes(calculatedMove, 'go')

  return calculatedMove
}

/* more sophisticated algorithm for finding the best next move, based on a depth-first search for possible outcomes */
export const bestMove = (moves, maxDepth = 7) => {
  // console.log('bestMove', { moves, maxDepth })

  // pick at random first few moves: a bit more fun to the user than grabbing the corners and never losing
  if ([0, 1].includes(moves.length)) {
    return nextMove(moves) 
  }

  // // pick at random first few moves: a bit more fun to the user than grabbing the corners and never losing
  // if ([0].includes(moves.length)) {
  //   return nextMove(moves) 
  // }

  // // special cases: get those corners and/or center first thing
  // if (moves.length === 0) {   
  //   // corner or center
  //   const startingMoves = [0, 2, 4, 6, 8]
  //   const startingMove = startingMoves[Math.floor(Math.random() * startingMoves.length)]
  //   return intToMoveObj(startingMove)
  // } else if (moves.length === 1 && [0, 2, 6, 8].includes(moves[0])) {
  //   // block the center!
  //   return intToMoveObj(4)
  // } else if (moves.length === 1 && moves[0] === 4) {
  //   // block the corner!
  //   return { row: Math.round(Math.random()) * 2, col: Math.round(Math.random()) * 2 }
  // }

  const calculatedMoves = calcMoves(moves, maxDepth)
  // console.log('calculated moves', { calculatedMoves })

  let bestMove
  if (calculatedMoves.moves.length > 0) {
    let sortedBestMoves = calculatedMoves.moves
      .map((m) => { m.weight = calcMoveWeight(m, calculatedMoves.turn); return m })
      .sort((a, b) => b.weight - a.weight)

    // console.log('sorted best moves', sortedBestMoves)

    // find one of the best moves, make a bucket out of the moves with same weight, then pick one at random
    sortedBestMoves = sortedBestMoves.length > 0 ? sortedBestMoves.filter((m) => m.weight === sortedBestMoves[0].weight) : undefined
    bestMove = sortedBestMoves ? sortedBestMoves[Math.floor(Math.random() * sortedBestMoves.length)] : undefined

    // console.log('BEST MOVE', { move: bestMove.move, outcomes: JSON.stringify(bestMove.outcomes) })
  }
  
  return (typeof bestMove !== 'undefined') ? intToMoveObj(bestMove.move) : nextMove(moves)
}
