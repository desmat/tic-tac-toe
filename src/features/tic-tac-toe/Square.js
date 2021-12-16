import { FaTimes, FaRegCircle } from 'react-icons/fa'
import './Square.css'

function Square({ free, marked, win, onClick, row, col }) {
  const className = 'Square' + (free ? (' free ' + free) : '') + (marked ? (' mark ' + marked) : ' ') + (win ? ' win' : '')
  const dataTestId = `${free ? 'free-' + free : ''}${marked && !win ? 'marked-' + marked : ''}${win ? 'win-' + marked : ''}-${row}-${col}`
  
  return (
    <div onClick={onClick} className={className} data-testid={dataTestId}>
      <span className="x"><FaTimes /></span>
      <span className="o"><FaRegCircle /></span>
    </div>
  )
}

export default Square
