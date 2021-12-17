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
  STATUS_WIN, 
  STATUS_DRAW,
  reset,
  selectTurn,
  selectStatus,
} from './features/tic-tac-toe/gameSlice'
import Game from './features/tic-tac-toe/Game'
import { Menu, MenuItem } from './Menu'
import './App.css'

function GameOverMenu({ onClick, element }) {
  const status = useSelector(selectStatus)
  const turn = useSelector(selectTurn)
  const navigate = useNavigate()

  return (
    <Menu transition="true" element={element}>
      {status === STATUS_DRAW &&
        <MenuItem message="Draw. Play again?" onClick={onClick} /> }      
      {status === STATUS_WIN &&
        <MenuItem message={`${turn ? `${turn.toUpperCase()} wins` : 'Game over'}. Play again?`} onClick={onClick} /> }
      <MenuItem message='Back' onClick={() => navigate('/')} />
    </Menu>
  )
}

function AboutMenu({ element }) {
  const navigate = useNavigate()

  return (
    <Menu element={element}>
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
  )
}

function App() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const gameOver = (status) => {
    setTimeout(
      () => navigate('gameover'),
      status === STATUS_WIN ? 1250 : 250
    )
  }
  const newGame = (mode) => {
    dispatch(reset({ mode }))
    navigate('play')
  }
  const gameElement = <Game onGameOver={gameOver} />

  return (
    <div className="App">
      <Routes>
        <Route path={'/'} element={
          <Menu element={gameElement}>
            <MenuItem message="Solo game" onClick={() => newGame(PLAY_MODE_LOCAL)} />
            <MenuItem message="Play against Bot" onClick={() => newGame(PLAY_MODE_X_VS_BOT)} />
            <MenuItem message="Bot against Bot" onClick={() => newGame(PLAY_MODE_BOT_VS_BOT)} />
            <MenuItem message="About" onClick={() => navigate('about')} />
          </Menu>
        } />

        <Route path={'gameover'} element={
          <GameOverMenu onClick={newGame} element={gameElement} />
        } />

        <Route path={'play'} element={gameElement} />

        <Route path={'about'} element={
          <AboutMenu element={gameElement} />
        } />

        <Route path="*" element={
          <Menu element={gameElement}>
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
