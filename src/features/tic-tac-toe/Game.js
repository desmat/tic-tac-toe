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
  STATUS_PLAYING,
  STATUS_WIN,
  STATUS_DRAW,
  STATUS_ABORTED,
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
import { recordRemoteGameMove, startRemoteGame } from './remoteGame'
import Grid from './Grid'
import './Game.css'

let lastMode, lastStatus, lastTurn, demoActionTimeout, lastMoves = []

function stateChanged(store, onGameOver) {
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
    if ([PLAY_MODE_X_VS_REMOTE, PLAY_MODE_O_VS_REMOTE].includes(mode) && remoteGameId && moves && moves.length !== lastMoves.length) {
      const player = moves.length % 2 ? 'x' : 'o' // x is always odd
      // console.log('stateUpdated: PLAY_MODE_-_VS_REMOTE', { mode, player, turn, status, moves })
      if ((mode === PLAY_MODE_X_VS_REMOTE && player === 'x') ||
          (mode === PLAY_MODE_O_VS_REMOTE && player === 'o')) {
        recordRemoteGameMove({ gameId: remoteGameId, player, moves, status })
      }
    }

    // process locally
    if (mode !== PLAY_MODE_DEMO && [STATUS_WIN, STATUS_DRAW, STATUS_ABORTED].includes(status)) {
      // game over
      onGameOver && onGameOver({ mode, status })
    } else if ((mode === PLAY_MODE_X_VS_BOT && turn === MARK_O) ||
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
        store.dispatch(reset({ mode: PLAY_MODE_DEMO }))
      }, 3000)
    }
  }

  lastMode = mode
  lastStatus = status
  lastTurn = turn
  lastMoves = moves
}

let lastGameId 

function Game({ onGameOver }) {
  const dispatch = useDispatch()
  const store = useStore()
  const grid = useSelector(selectGridData)
  const mode = useSelector(selectMode)
  const status = useSelector(selectStatus)
  const turn = useSelector(selectTurn)
  const gameId = useSelector(selectRemoteGameId)

  useEffect(() => {
    // console.log('Game useEffect', { gameId, mode })

    if (mode !== PLAY_MODE_DEMO && demoActionTimeout) {
      clearTimeout(demoActionTimeout)
    }

    let cleanupRemoteGame
    if (gameId && gameId !== lastGameId && [PLAY_MODE_X_VS_REMOTE, PLAY_MODE_O_VS_REMOTE].includes(mode)) {
      lastGameId = gameId // useEffect will fire with same params when switching menus
      cleanupRemoteGame = startRemoteGame({ gameId, player: mode[0].toLowerCase(), onRemotePlayerMove: ({ row, col }) => {
        // console.log('remote player moved', { row, col })
        dispatch(mark({ row, col }))
      }, onRemotePlayerDisconnected: ({ gameId, player }) => {
        // console.log('remote player disconnected', { gameId, player })
        dispatch(set({ status: STATUS_ABORTED }))
      }})
    }

    return () => {
      // console.log('Game useEffect cleanup', { gameId, mode })
      if (cleanupRemoteGame) {
        cleanupRemoteGame()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, mode])


  useEffect(() => {
    // console.log('useEffect', { mode, status, turn })
    const unsubscribe = store.subscribe(() => stateChanged(store, onGameOver))

    // kick off demo mode initially
    if (mode === PLAY_MODE_DEMO && status === STATUS_INIT) {
      dispatch(reset({ mode: PLAY_MODE_DEMO }))
    }

    return unsubscribe
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
