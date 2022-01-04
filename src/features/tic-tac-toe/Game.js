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
  selectGameId,
  selectGameToJoin,
  selectGameToCleanup,
} from './gameSlice'
import { recordRemoteGameMove, getRemoteGame, startRemoteGame } from './remoteGame'
import Grid from './Grid'
import './Game.css'

let lastMode, lastStatus, lastTurn, lastMoves = []

function storeStateChanged(store) {
  const state = store.getState()
  const mode = selectMode(state)
  const grid = selectGridData(state)
  const status = selectStatus(state)
  const turn = selectTurn(state)
  const moves = selectMoves(state)
  const gameId = selectGameId(state)

  if ((lastMode !== mode || lastStatus !== status || lastTurn !== turn || (moves && moves.length !== lastMoves.length))) {
    // console.log('store state changed', JSON.stringify({ mode, status, turn, moves, gameId, gameToJoin }))

    // update remote game
    if ([PLAY_MODE_X_VS_REMOTE, PLAY_MODE_O_VS_REMOTE].includes(mode) && 
        [STATUS_PLAYING, STATUS_WIN, STATUS_DRAW].includes(status) &&
        gameId && moves && moves.length !== lastMoves.length) {
      const player = moves.length % 2 ? 'x' : 'o' // x is always odd
      // console.log('stateUpdated: PLAY_MODE_-_VS_REMOTE', { mode, player, turn, status, moves })
      if ((mode === PLAY_MODE_X_VS_REMOTE && player === 'x') ||
          (mode === PLAY_MODE_O_VS_REMOTE && player === 'o')) {
        recordRemoteGameMove({ gameId, player, moves, status })
      }
    }

    // process locally
    if ((mode === PLAY_MODE_X_VS_BOT && [STATUS_PLAYING].includes(status) && turn === MARK_O) ||
        (mode === PLAY_MODE_O_VS_BOT && [STATUS_PLAYING].includes(status) && turn === MARK_X) ||
        (mode === PLAY_MODE_BOT_VS_BOT && [STATUS_PLAYING].includes(status))) {
      // bot plays
      setTimeout(() => {
        store.dispatch(mark(bot.nextMove(grid)))
      }, Math.floor(Math.random() * 5) * 100 + 200)
    } else if (mode === PLAY_MODE_DEMO && [STATUS_PLAYING].includes(status)) {
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

let demoActionTimeout, cleanupRemoteGame, joinedGameId

function Game() {
  const dispatch = useDispatch()
  const store = useStore()
  const grid = useSelector(selectGridData)
  const mode = useSelector(selectMode)
  const status = useSelector(selectStatus)
  const turn = useSelector(selectTurn)
  const gameId = useSelector(selectGameId)
  // GameContainer uses navigation for game lifecycles but here we use store's state
  // the two selectors below are essentially connecting the two
  const gameToJoin = useSelector(selectGameToJoin) 
  const gameToCleanup = useSelector(selectGameToCleanup)


  // trigger to cleanup remote resources beyond the games own lifecycle,
  // such as user navigating away from game screen
  useEffect(() => {
    // console.log('Game useEffect', { mode, gameId, status, gameToCleanup })

    if (gameToCleanup && gameToCleanup === gameId) {
      if (cleanupRemoteGame) {
        cleanupRemoteGame()
        cleanupRemoteGame = undefined
      }

      if ([STATUS_INIT, STATUS_WAITING, STATUS_PLAYING].includes(status)) {
        dispatch(set({ gameToCleanup: undefined, status: STATUS_ABORTED }))
      } else {        
        dispatch(set({ gameToCleanup: undefined }))        
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gameId, status, gameToCleanup])
      

  // trigger to cleanup remote resources based on the game's lifecycle
  useEffect(() => {
    // console.log('Game useEffect', { mode, gameId, status })
    
    return () => {
      // console.log('Game useEffect cleanup', { mode, gameId, status, joinedGameId, cleanupRemoteGame })      
      // game terminated, ie status moved from PLAYING to (WIN, DRAW, ABORTED, ERROR)
      if (cleanupRemoteGame && (status === STATUS_PLAYING && gameId === joinedGameId)) {
        // console.log('Game useEffect cleanup CLEANUP', { mode, gameId, status })      
        cleanupRemoteGame()
        cleanupRemoteGame = undefined
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, mode, status])


  // trigger on gameId, mode, status and createdGameId updates
  useEffect(() => {
    // console.log('Game useEffect', { mode, gameId, gameToJoin, joinedGameId })
    
    // kill the demo mode
    if (mode !== PLAY_MODE_DEMO && demoActionTimeout) {
      clearTimeout(demoActionTimeout)
    }

    // remote game lifecycle
    if (gameToJoin && gameToJoin !== gameId) {
      // lookup the game we may or may not want to join, as player x or o depending on status
      getRemoteGame({ gameId: gameToJoin }).then((game) => {
        // console.log('getRemoteGame: then: LOOKING AT REMOTE GAME', { game })

        // NOTE: player x creates the game and is the first to join at status INIT, 
        // flips status to WAITING then player o can join
        startRemoteGame({ gameId: gameToJoin, player: game.status === STATUS_INIT ? 'x' : 'o',
          onRemotePlayerMove: ({ row, col }) => {
            // console.log('remote player moved', { row, col })
            dispatch(mark({ row, col }))
          }, 
          onRemotePlayerConnected: ({ gameId, player, status }) => {
            // console.log('remote player connected', { gameId, player, status })
            dispatch(reset({ 
              mode: player === 'x' ? PLAY_MODE_O_VS_REMOTE : PLAY_MODE_X_VS_REMOTE, 
              status,
              gameId, 
            }))     
          }, 
          onRemotePlayerDisconnected: ({ gameId, player }) => {
            // console.log('remote player disconnected', { gameId, player })
            dispatch(set({ status: STATUS_ABORTED }))
          },
          onError: ({ gameId, error }) => {
            console.error('Error starting remote game', { gameId, error })
            dispatch(set({ status: STATUS_ERROR }))
          }
        }).then(({ gameId, status, cleanup }) => {
          // console.log('startRemoteGame success', { gameId, status, cleanup })
          cleanupRemoteGame = cleanup
          joinedGameId = gameId
          dispatch(set({ gameId, status, gameToJoin: undefined }))
        })
      })
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, mode, gameToJoin])


  // trigger on page load: kick off the demo mode in the background
  useEffect(() => {
    // console.log('Game useEffect', {})
    const unsubscribe = store.subscribe(() => storeStateChanged(store))

    // kick off demo mode initially
    if (mode === PLAY_MODE_DEMO && status === STATUS_INIT) {
      dispatch(reset({ mode: PLAY_MODE_DEMO, status: STATUS_PLAYING }))
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
