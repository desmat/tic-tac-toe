import React, { useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux'
import * as bot from './bot'
import {
  MARK_X,
  MARK_O,
  PLAY_MODE_BOT_VS_BOT,
  PLAY_MODE_DEMO,
  PLAY_MODE_X_VS_BOT,
  PLAY_MODE_O_VS_BOT,
  PLAY_MODE_X_VS_REMOTE,
  PLAY_MODE_O_VS_REMOTE,
  STATUS_INIT,
  STATUS_WAITING,
  STATUS_PLAYING,
  STATUS_WIN,
  STATUS_DRAW,
  STATUS_ABORTED,
  STATUS_ERROR,
  PLAY_MODE_LOCAL,
  mark,
  reset,
  set,
  selectGridData,
  selectMode,
  selectStatus,
  selectTurn,
  selectMoves,
  selectRemoteGameId,
} from './gameSlice'
import { recordRemoteGameMove, getRemoteGame, startRemoteGame } from './remoteGame'
import Grid from './Grid'
import './Game.css'

let lastMode, lastStatus, lastTurn, lastMoves

function stateChanged(store) {
  const state = store.getState()
  const mode = selectMode(state)
  const grid = selectGridData(state)
  const status = selectStatus(state)
  const turn = selectTurn(state)
  const moves = selectMoves(state)
  const remoteGameId = selectRemoteGameId(state)

  if ((lastMode !== mode || lastStatus !== status || lastTurn !== turn || (moves && moves.length !== lastMoves.length))) {
    // console.log('store changed', { mode, status, turn, moves, remoteGameId })

    // update remote game
    if ([PLAY_MODE_X_VS_REMOTE, PLAY_MODE_O_VS_REMOTE].includes(mode) && 
        [STATUS_PLAYING, STATUS_WIN, STATUS_DRAW].includes(status) &&
        remoteGameId && moves && moves.length !== lastMoves.length) {
      const player = moves.length % 2 ? 'x' : 'o' // x is always odd
      // console.log('stateUpdated: PLAY_MODE_-_VS_REMOTE', { mode, player, turn, status, moves })
      if ((mode === PLAY_MODE_X_VS_REMOTE && player === 'x') ||
          (mode === PLAY_MODE_O_VS_REMOTE && player === 'o')) {
        recordRemoteGameMove({ gameId: remoteGameId, player, moves, status })
      }
    }

    // process locally
    if ((mode === PLAY_MODE_X_VS_BOT && [STATUS_INIT, STATUS_PLAYING].includes(status) && turn === MARK_O) ||
        (mode === PLAY_MODE_O_VS_BOT && [STATUS_INIT, STATUS_PLAYING].includes(status) && turn === MARK_X) ||
        (mode === PLAY_MODE_BOT_VS_BOT && [STATUS_INIT, STATUS_PLAYING].includes(status))) {
      // bot plays
      setTimeout(() => {
        store.dispatch(mark(bot.nextMove(grid)))
      }, Math.floor(Math.random() * 5) * 100 + 200)
    } else if (mode === PLAY_MODE_DEMO && [STATUS_INIT, STATUS_PLAYING].includes(status)) {
      // bot plays in demo mode (slower)
      demoActionTimeout = setTimeout(() => {
        store.dispatch(mark(bot.nextMove(grid)))
      }, Math.floor(Math.random() * 10) * 100 + 500)
    } else if (mode === PLAY_MODE_DEMO && [STATUS_WIN, STATUS_DRAW].includes(status)) {
      // restart demo game until real game
      demoActionTimeout = setTimeout(() => {
        store.dispatch(reset({ mode: PLAY_MODE_DEMO, status: STATUS_PLAYING }))
      }, 3000)
    }
  }

  lastMode = mode
  lastStatus = status
  lastTurn = turn
  lastMoves = moves
}

let demoActionTimeout, cleanupRemoteGame, joinedGameId, remotePlayerConnected

function Game() {
  const dispatch = useDispatch()
  const store = useStore()
  const grid = useSelector(selectGridData)
  const mode = useSelector(selectMode)
  const status = useSelector(selectStatus)
  const turn = useSelector(selectTurn)
  const gameId = useSelector(selectRemoteGameId)

  // trigger on gameId, mode, status updates
  useEffect(() => {
    // console.log('Game useEffect', { mode, gameId, status, joinedGameId })
    
    // kill the demo mode
    if (mode !== PLAY_MODE_DEMO && demoActionTimeout) {
      clearTimeout(demoActionTimeout)
    }

    // remote game hookup
    if (mode.includes('REMOTE') && [STATUS_INIT, STATUS_WAITING].includes(status) &&
        gameId && gameId !== joinedGameId) {
      // lookup the game we may or may not want to join, as player x or o depending on status
      getRemoteGame({ gameId }).then((game) => {
        // console.log('> LOOKING AT REMOTE GAME <', { game })

        // TODO provide userId
        // NOTE: player_x creates the game and is the first to join at status INIT, then flips status to WAITING
        startRemoteGame({ gameId, player: game.status === STATUS_INIT ? 'x' : 'o',
          onRemotePlayerMove: ({ row, col }) => {
            // console.log('remote player moved', { row, col })
            dispatch(mark({ row, col }))
          }, 
          onRemotePlayerConnected: () => {
            // console.log('remote player connected', { gameId })
            remotePlayerConnected = true
            dispatch(set({ status: STATUS_PLAYING }))
          }, 
          onRemotePlayerDisconnected: () => {
            // console.log('remote player disconnected', { gameId })
            remotePlayerConnected = false
            dispatch(set({ status: STATUS_ABORTED }))
          },
          onError: ({ gameId, error }) => {
            console.error('Error starting remote game', { gameId, error })
            dispatch(set({ status: STATUS_ERROR }))
          }
        }).then((cleanup) => {
          // console.log('startRemoteGame success', { gameId, cleanup })
          cleanupRemoteGame = cleanup
          joinedGameId = gameId
          remotePlayerConnected = false
          if (status === STATUS_INIT) {
            dispatch(set({ status: STATUS_WAITING }))
          }
        })
      })
    }

    return () => {
      // console.log('Game useEffect cleanup', { mode, gameId, status, joinedGameId, remotePlayerConnected, cleanupRemoteGame })      
      if (cleanupRemoteGame && (
          (status === STATUS_WAITING && !remotePlayerConnected) /* game created and no one joined */ ||           
          (status === STATUS_PLAYING) /* leave ongoing game */ ||
          (status === STATUS_ABORTED) /* remote player left ongoing game */ )) {
        cleanupRemoteGame()
        cleanupRemoteGame = undefined
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, mode, status])

  // trigger initially
  useEffect(() => {
    // console.log('Game useEffect', {})
    const unsubscribe = store.subscribe(() => stateChanged(store))

    // kick off demo mode initially
    if (mode === PLAY_MODE_DEMO && status === STATUS_INIT) {
      dispatch(reset({ mode: PLAY_MODE_DEMO }))
    }

    return () => {
      // console.log('Game useEffect cleanup', {})
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  let canClick = (mode === PLAY_MODE_LOCAL) ||
    (turn === MARK_X && [PLAY_MODE_X_VS_BOT, PLAY_MODE_X_VS_REMOTE].includes(mode)) ||
    (turn === MARK_O && [PLAY_MODE_O_VS_BOT, PLAY_MODE_O_VS_REMOTE].includes(mode))

  return (
    <div className={`tic-tac-toe Game ${mode.toLowerCase()} ${status.toLowerCase()} ${turn}`}>
      <Grid
        gridData={grid}
        turn={canClick ? turn : undefined}
        onClick={(row, col) => canClick && dispatch(mark({ row, col }))}
      />
    </div>
  )
}

export default Game
