import Square from './Square'
import './Grid.css'

function Grid({ gridData, turn, onClick }) {
  return (
    <table className="Grid">
      <tbody>
        {gridData.map((rowData, row) => (
          <tr className="Row" key={row}>
            {rowData.map((squareData, col) => (
              <td className="Col" key={col}>
                <Square
                  row={row}
                  col={col}
                  free={(!(typeof turn === 'undefined') && !squareData.marked) ? turn : ''}
                  marked={squareData.marked}
                  win={squareData.win}
                  onClick={() => onClick(row, col)} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default Grid
