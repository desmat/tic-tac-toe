import { FaRedoAlt, FaArrowLeft } from 'react-icons/fa'
import {
  Route,
  Routes,
  useNavigate,
} from "react-router-dom"
import {
  PLAY_MODE_LOCAL,
  PLAY_MODE_X_VS_BOT,
  PLAY_MODE_BOT_VS_BOT,
} from './features/tic-tac-toe/gameSlice'
import Game from './features/tic-tac-toe/Game'
import { GameContainer, FindRemoteGameMenu } from './Game'
import { Menu, MenuItem } from './Menu'
import './App.css'

function AboutMenu({ element }) {
  const navigate = useNavigate()

  return (
    <Menu element={element}>
      <div>
        <p style={{ textAlign: "center" }}>
          <i>A simple web app utilizing latest tech and best practice from the React ecosystem</i>
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
  const navigate = useNavigate()
  
  const newGame = (mode) => {
    if (mode === PLAY_MODE_LOCAL) {
      navigate('/play')
    } else if (mode === PLAY_MODE_X_VS_BOT) {
      navigate('/play/bot')
    } else {
      navigate(`/play/${mode.toLowerCase()}`)
    }
  }
  
  const gameElement = <Game />

  return (
    <div className="App">
      <Routes>
        <Route path={'/'} element={
          <Menu element={gameElement}>
            <MenuItem message="Solo game" onClick={() => newGame(PLAY_MODE_LOCAL)} />
            <MenuItem message="Remote game" onClick={() => navigate('remote')} />
            <MenuItem message="Play against Bot" onClick={() => newGame(PLAY_MODE_X_VS_BOT)} />
            <MenuItem message="Bot against Bot" onClick={() => newGame(PLAY_MODE_BOT_VS_BOT)} />
            <MenuItem message="About" onClick={() => navigate('about')} />
          </Menu>
        } />

        <Route path={'play'} element={
          <GameContainer element={gameElement} />
        } />

        <Route path={'play/:mode'} element={
          <GameContainer element={gameElement} />
        } />

        <Route path={'play/:mode/:id'} element={
          <GameContainer element={gameElement} />
        } />

        <Route path={'remote'} element={
          <FindRemoteGameMenu element={gameElement} />
        } />

        <Route path={'about'} element={
          <AboutMenu element={gameElement} />
        } />

        <Route path="*" element={
          <Menu element={gameElement}>
            <MenuItem message="404 Not Found" onClick={() => navigate('/')} />
          </Menu>
        } />
      </Routes>

      <div className='HomeIcon' title="Back to main menu" onClick={() => navigate('/')}>
        <FaArrowLeft />
      </div>

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
