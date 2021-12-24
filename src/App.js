import { useState, useEffect } from 'react'
import { FaRedoAlt, FaArrowLeft } from 'react-icons/fa'
import { useDispatch, useSelector } from 'react-redux'
import {
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom"
import {
  PLAY_MODE_LOCAL,
  PLAY_MODE_X_VS_BOT,
  PLAY_MODE_BOT_VS_BOT,
  PLAY_MODE_X_VS_REMOTE,
  PLAY_MODE_O_VS_REMOTE,
  STATUS_WIN, 
  STATUS_DRAW,
  STATUS_ABORTED,
  reset,
  selectTurn,
  selectStatus,
  selectMode,
} from './features/tic-tac-toe/gameSlice'
import Game from './features/tic-tac-toe/Game'
import { Menu, MenuItem } from './Menu'
import { createRemoteGame, findRemoteGames, joinRemoteGame } from './features/tic-tac-toe/remoteGame'
import './App.css'

function CreateRemoteGameMenu({ element }) {
  const navigate = useNavigate()

  useEffect(() => {
    // console.log('useEffect', {})
    const cleanup = createRemoteGame({ onSuccess: (gameId) => {
      console.log('game created', { gameId })
    }, onRemotePlayerJoined: (gameId) => {
      console.log('player o joined', { gameId })
      navigate(`/play/x_vs_remote/${gameId}`)  
    }})

    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Menu element={element}>
      <div>
        <p>
          <i>Waiting for player to join...</i>          
        </p>
      </div>
      <div>
        <MenuItem message="Back" onClick={() => navigate('/remote')} />
      </div>
    </Menu>
  )
}

function FindRemoteGameMenu({ element }) {
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const join = (gameId) => {
    joinRemoteGame({ gameId, player: 'o', onSuccess: () => {
      navigate(`/play/o_vs_remote/${gameId}`)  
    }})
  }

  useEffect(() => {
    const cleanup = findRemoteGames(setGames)

    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Menu element={element}>
      <div>
        <p>
          {(!games || games.length === 0)
            && <i>Looking for games...</i>
          }
        </p>
      </div>
      <div>
        {games && games.length > 0 
          && games.map((id) => <MenuItem key={id} message={`Join ${id}`} onClick={() => join(id)} />)
        }
        <MenuItem message="Start new game" onClick={() => navigate('start')} />
        <MenuItem message="Back" onClick={() => navigate('/')} />
      </div>
    </Menu>
  )
}

function GameOverMenu({ onClick, element }) {
  const mode = useSelector(selectMode)
  const status = useSelector(selectStatus)
  const turn = useSelector(selectTurn)
  const navigate = useNavigate()
  const newGame = () => onClick(mode)

  return (
    <Menu transition="true" element={element}>
      {status === STATUS_ABORTED &&
        <p><i>Remote player disconnected</i></p> }      
      {status === STATUS_DRAW &&
        <MenuItem message="Draw. Play again?" onClick={newGame} /> }      
      {status === STATUS_WIN &&
        <MenuItem 
          message={`${
            (mode === PLAY_MODE_X_VS_REMOTE && turn === 'x') || (mode === PLAY_MODE_O_VS_REMOTE && turn === 'o') ? 'You win!' :
            (mode === PLAY_MODE_X_VS_REMOTE && turn === 'o') || (mode === PLAY_MODE_O_VS_REMOTE && turn === 'x') ? 'Remote player wins.' :
            turn ? `Player ${turn.toUpperCase()} wins.` : 
            'Game over.'} Play again?`} 
          onClick={newGame} /> }
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

function GameContainer({ element }) {
  const dispatch = useDispatch()
  const { mode = PLAY_MODE_LOCAL, id } = useParams()

  useEffect(() => {
    // console.log('GameContainer useEffect', { mode, id })
    dispatch(reset({ mode: mode.toUpperCase(), remoteGameId: id }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id])

  return (
    <div className={`GameContainer}`}>
      <div className="element">
        {element}
      </div>
    </div>
  )
}

function App() {
  const navigate = useNavigate()
  const gameOver = ({ status }) => {
    setTimeout(() => {
      navigate('/play/gameover')
    }, status === STATUS_WIN ? 1250 : 250)
  }
  const newGame = (mode) => {
    if ([PLAY_MODE_X_VS_REMOTE, PLAY_MODE_O_VS_REMOTE].includes(mode)) {
      navigate('/remote')
    } else {
      navigate(`/play${mode === PLAY_MODE_LOCAL ? '' : `/${mode.toLowerCase()}`}`)
    }
  }
  const gameElement = <Game onGameOver={gameOver} />

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

        <Route path={'play/gameover'} element={
          <GameOverMenu onClick={newGame} element={gameElement} />
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

        <Route path={'remote/start'} element={
          <CreateRemoteGameMenu element={gameElement} />
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
