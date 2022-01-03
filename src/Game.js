import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  useNavigate,
  useParams,
} from "react-router-dom"
import {
  PLAY_MODE_LOCAL,
  PLAY_MODE_X_VS_BOT,
  PLAY_MODE_O_VS_BOT,
  PLAY_MODE_BOT_VS_BOT,
  PLAY_MODE_X_VS_REMOTE,
  PLAY_MODE_O_VS_REMOTE,
  STATUS_INIT,
  STATUS_WAITING,
  STATUS_PLAYING,
  STATUS_WIN,
  STATUS_DRAW,
  STATUS_ABORTED,
  STATUS_ERROR,
  reset,
  selectTurn,
  selectStatus,
  selectMode,
  selectRemoteGameId,
} from './features/tic-tac-toe/gameSlice'
import { createRemoteGame, findRemoteGames } from './features/tic-tac-toe/remoteGame'
import { Menu, MenuItem } from './Menu'
import './App.css'

export function FindRemoteGameMenu({ element }) {
  const navigate = useNavigate()
  const [games, setGames] = useState([])

  useEffect(() => {
    return findRemoteGames(setGames)
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
          && games.map((id) => <MenuItem key={id} message={`Join ${id}`} onClick={() => navigate(`/play/remote/${id}`)} />)
        }
        <MenuItem message="Start new game" onClick={() => navigate('/play/remote')} />
        <MenuItem message="Back" onClick={() => navigate('/')} />
      </div>
    </Menu>
  )
}

function WaitingRemoteGameMenu({ element }) {
  const navigate = useNavigate()

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

function GameOverMenu({ onClick, element }) {
  const mode = useSelector(selectMode)
  const status = useSelector(selectStatus)
  const turn = useSelector(selectTurn)
  const navigate = useNavigate()
  
  const newGame = () => {
    onClick(mode)
  }

  return (
    <Menu transition="true" element={element}>
      {status === STATUS_ERROR &&
        <p><i>Error loading remote game</i></p>}
      {status === STATUS_ABORTED &&
        <p><i>Remote player disconnected</i></p>}
      {status === STATUS_DRAW &&
        <MenuItem message="Draw. Play again?" onClick={newGame} />}
      {status === STATUS_WIN &&
        <MenuItem
          message={`${
              (mode === PLAY_MODE_X_VS_REMOTE && turn === 'x') ||
              (mode === PLAY_MODE_X_VS_BOT && turn === 'x') ||
              (mode === PLAY_MODE_O_VS_REMOTE && turn === 'o') ||
              (mode === PLAY_MODE_O_VS_BOT && turn === 'o')
              ? 'You win!' :
              (mode === PLAY_MODE_X_VS_BOT && turn === 'o') ||
              (mode === PLAY_MODE_BOT_VS_BOT && turn === 'o')
              ? 'Bot player O wins.' :
              (mode === PLAY_MODE_O_VS_BOT && turn === 'x') ||
              (mode === PLAY_MODE_BOT_VS_BOT && turn === 'x')
              ? 'Bot player X wins.' :
              (mode === PLAY_MODE_X_VS_REMOTE && turn === 'o') ||
              (mode === PLAY_MODE_O_VS_REMOTE && turn === 'x')
              ? 'Remote player wins.' :
              turn
              ? `Player ${turn.toUpperCase()} wins.`
              : 'Game over.'
            } Play again?`}
          onClick={newGame} />}
      <MenuItem message='Back' onClick={() => navigate('/')} />
    </Menu>
  )
}

let lastGameId, createdGameId

export function GameContainer({ element }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { mode = PLAY_MODE_LOCAL, id } = useParams()
  const status = useSelector(selectStatus)
  const remoteGameId = useSelector(selectRemoteGameId)
  const [showGameOverMenu, setShowGameOverMenu] = useState()
  
  const newGame = (mode, gameId) => {
    console.log('newGame', { mode, gameId })
    if (mode.toLowerCase().includes('remote')) {
      dispatch(reset({ mode: mode.toUpperCase(), remoteGameId: gameId }))      
    } else {
      dispatch(reset({ mode: mode.toUpperCase(), status: STATUS_PLAYING }))      
    }
  }

  const playAgain = (mode) => {
    if (mode.toLowerCase().includes('remote')) {
      navigate('/remote')
    } else {
      newGame(mode)
    }
  }

  // trigger on mode, id and status
  useEffect(() => {
    // console.log('GameContainer useEffect', { mode, id, status, lastGameId, createdGameId })
    
    if (mode.toUpperCase().includes('REMOTE')) {
      if (id) {
        // console.log('(maybe) JOIN REMOTE GAME', { id, status, remoteUserId, lastGameId, createdGameId })
        if (id && !createdGameId && id !== lastGameId) {
          console.log('JOIN REMOTE GAME', { id, mode })
          newGame(PLAY_MODE_O_VS_REMOTE, id) // this is player o joining a game created by a remote player x
        }
      } else if (!createdGameId) {
        // console.log('CREATE REMOTE GAME')
        createRemoteGame().then(({ gameId }) => {
          console.log('game created', { gameId })
          createdGameId = gameId
          newGame(PLAY_MODE_X_VS_REMOTE, gameId) // game creator is player x
          navigate(`/play/remote/${gameId}`)
        })
      }
    }

    lastGameId = id

    return () => {
      // console.log('GameContainer useEffect cleanup', { mode, id, status, lastGameId, createdGameId })
      if (id && id === createdGameId) {
        createdGameId = undefined
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, status])

  // trigger on status
  useEffect(() => {
    // console.log('GameContainer useEffect', { status })
    let timeout
    if ([STATUS_WIN, STATUS_DRAW, STATUS_ABORTED].includes(status)) {
      // show the game over menu after a short delay
      timeout = setTimeout(() => {
        setShowGameOverMenu(true)
      }, status === STATUS_WIN ? 1250 : 250)
    }

    return () => {
      // console.log('GameContainer useEffect cleanup', { status })
      clearTimeout(timeout)
      setShowGameOverMenu(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // trigger on mode
  useEffect(() => {
    // console.log('GameContainer useEffect', { mode })
    if (!mode.includes('remote')) {
      // console.log('CREATE LOCAL GAME')
      if (mode === 'bot') {
        newGame(PLAY_MODE_X_VS_BOT)
      } else {
        newGame(mode)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // console.log('GameContainer render', { mode, status, id, remoteGameId, createdGameId})
  if (mode.includes('remote') && (!id || [STATUS_INIT, STATUS_WAITING].includes(status) || 
      (createdGameId && createdGameId !== remoteGameId))) {
    return <WaitingRemoteGameMenu element={element} />
  }

  if (showGameOverMenu || status === STATUS_ERROR || status === STATUS_ABORTED) {
    return <GameOverMenu onClick={playAgain} element={element} />
  }
  
  return (
    <div className={`GameContainer}`}>
      <div className="element">
        {element}
      </div>
    </div>
  )
}
