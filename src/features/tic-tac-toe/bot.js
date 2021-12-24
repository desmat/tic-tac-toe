
/* super dumb bot that'll just pick a free square by random */
export const nextMove = (grid) => {
    // console.log('nextMove', grid)
    if (!grid) return []
  
    const freeSquares = grid.flat().filter((square) => !square.marked)
    if (freeSquares.length > 0) {
      const square = freeSquares[Math.floor(Math.random() * freeSquares.length)]
      return { row: square.row, col: square.col }
    }
  }
  