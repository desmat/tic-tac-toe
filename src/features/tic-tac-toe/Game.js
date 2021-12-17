import React, { useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux'
import { 
  MARK_X,
  MARK_O,
  PLAY_MODE_BOT_VS_BOT,
  PLAY_MODE_DEMO,
  PLAY_MODE_X_VS_BOT,
  PLAY_MODE_O_VS_BOT,
  STATUS_INIT,
  STATUS_PLAYING,
  STATUS_WIN, 
  STATUS_DRAW,
  PLAY_MODE_LOCAL,
  mark,
  reset,
  selectGridData,
  selectMode,
  selectStatus,
  selectTurn } from './gameSlice'
import Grid from './Grid'
import './Game.css'

let lastMode, lastStatus, lastTurn, demoActionTimeout

function stateChanged(store, onGameOver) {
  const state = store.getState()
  const mode = selectMode(state)
  const status = selectStatus(state)
  const turn = selectTurn(state)

  if ((lastMode !== mode || lastStatus !== status || lastTurn !== turn)) {
    // console.log('store changed', { mode, status, turn })
    
    if (mode !== PLAY_MODE_DEMO && [STATUS_WIN, STATUS_DRAW].includes(status)) {
      // game over
      onGameOver && onGameOver(status, turn)
    } else if ((mode === PLAY_MODE_X_VS_BOT && turn === MARK_O) ||
               (mode === PLAY_MODE_BOT_VS_BOT && [STATUS_INIT, STATUS_PLAYING].includes(status))) {
      // bot plays
      setTimeout(() => {
        store.dispatch(mark({ bot: true }))}, 
        Math.floor(Math.random() * 5) * 100 + 200)
    } else if (mode === PLAY_MODE_DEMO && [STATUS_INIT, STATUS_PLAYING].includes(status)) {
      // bot plays in demo mode (slower)
      demoActionTimeout = setTimeout(() => {
        store.dispatch(mark({ bot: true }))}, 
        Math.floor(Math.random() * 10) * 100 + 500)
    } else if (mode === PLAY_MODE_DEMO && [STATUS_WIN, STATUS_DRAW].includes(status)) {
      // restart demo game until real game
      demoActionTimeout = setTimeout(() => {
        store.dispatch(reset({ mode: PLAY_MODE_DEMO }))}, 
        3000)
    }
  }

  lastMode = mode
  lastStatus = status
  lastTurn = turn
}

function Game({ onGameOver }) {
  const dispatch = useDispatch()
  const store = useStore()
  const grid = useSelector(selectGridData)
  const mode = useSelector(selectMode)
  const status = useSelector(selectStatus)
  const turn = useSelector(selectTurn)
  
  useEffect(() => {
    // console.log('useEffect', { mode, status, turn })
    const unsubscribe = store.subscribe(() => stateChanged(store, onGameOver))

    if (mode === PLAY_MODE_DEMO && status === STATUS_INIT) {
      dispatch(reset({ mode: PLAY_MODE_DEMO }))
    } else if (mode !== PLAY_MODE_DEMO && demoActionTimeout) {
      clearTimeout(demoActionTimeout)
    }

    return unsubscribe
  }, []);

  let canClick = (mode === PLAY_MODE_LOCAL) ||
                 (mode === PLAY_MODE_X_VS_BOT && turn === MARK_X) ||
                 (mode === PLAY_MODE_O_VS_BOT && turn === MARK_O)

  return (
    <div className={`tic-tac-toe Game`}>
      <Grid 
        gridData={grid} 
        turn={canClick ? turn : undefined}
        onClick={(row, col) => canClick && dispatch(mark({ row, col }))} 
      />
    </div>
  )
}

export default Game
