import { FaRedoAlt } from 'react-icons/fa'
import { useDispatch, useSelector } from 'react-redux'
import {
  Route,
  Routes,
  useNavigate,
} from "react-router-dom"
import {
  PLAY_MODE_LOCAL,
  PLAY_MODE_X_VS_BOT,
  PLAY_MODE_BOT_VS_BOT,
  reset,
  selectTurn,
} from './features/tic-tac-toe/gameSlice'
import Game from './features/tic-tac-toe/Game'
import { Menu, MenuItem } from './Menu'
import './App.css'

function WinMenu({ onClick, element }) {
  const turn = useSelector(selectTurn)
  const navigate = useNavigate()

  return (
    <Menu transition="true" element={element}>
      <MenuItem message={`${turn ? `${turn.toUpperCase()} wins` : 'Game over'}. Play again?`} onClick={onClick} />
      <MenuItem message='Back' onClick={() => navigate('/')} />
    </Menu>
  )
}

function App() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const handleWin = () => setTimeout(() => navigate(`win`), 1250)
  const handleDraw = () => setTimeout(() => navigate(`draw`), 250)
  const newGame = (mode) => {
    dispatch(reset({ mode }))
    navigate('play')
  }
  const gameElement = <Game onWin={handleWin} onDraw={handleDraw} />

  return (
    <div className="App">
        <Routes>
          <Route path={'/'} element={
            <Menu element={<Game demoMode="true" />}>
              <MenuItem message="Solo game" onClick={() => newGame(PLAY_MODE_LOCAL)} />
              <MenuItem message="Play against Bot" onClick={() => newGame(PLAY_MODE_X_VS_BOT)} />
              <MenuItem message="Bot against Bot" onClick={() => newGame(PLAY_MODE_BOT_VS_BOT)} />
              <MenuItem message="About" onClick={() => navigate('about')} />
            </Menu>
          } />

          <Route path={'win'} element={
            <WinMenu onClick={newGame} element={gameElement} />
          } />

          <Route path={'draw'} element={
            <Menu transition="true" element={gameElement}>
              <MenuItem message="Draw. Play again?" onClick={newGame} />
              <MenuItem message="Back" onClick={() => navigate('/')} fadeIn="true" />
            </Menu>
          } />

          <Route path={'play'} element={gameElement} />

          <Route path={'about'} element={
            <Menu element={gameElement}>
              <div>
                <p style={{ textAlign: "center" }}>
                  <i>A very simple app utilizing latest tech and best practice from the React ecosystem</i>
                  <br />
                  <br />
                  <a target="_blank" rel="noreferrer" href="https://github.com/desmat">github.com/desmat</a>
                </p>
              </div>
              <div>
                <MenuItem message="Back" onClick={() => navigate('/')} />
              </div>
            </Menu>
          } />

          <Route path="*" element={
            <Menu>
              <MenuItem message="404 Not Found" onClick={() => navigate('/')} />
            </Menu>
          } />
        </Routes>

      {/* force reload - DEBUG ONLY */}
      {(!process.env.NODE_ENV || process.env.NODE_ENV === 'development') &&
        <div className='DebugReload' title="Force reload (DEBUG ONLY)" onClick={() => window.location = '/'}>
          <FaRedoAlt />
        </div>
      }

    </div>
  )
}

export default App
