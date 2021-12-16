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
  PLAY_MODE_LOCAL,
  mark,
  reset,
  selectGridData,
  selectMode,
  selectStatus,
  selectTurn } from './gameSlice'
import Grid from './Grid'
import './Game.css'

let lastTurn, lastStatus, demoActionTimeout

function stateChanged(store, onWin, onDraw) {
  const state = store.getState()
  const mode = selectMode(state)
  const status = selectStatus(state)
  const turn = selectTurn(state)

  if (mode !== PLAY_MODE_LOCAL && (lastStatus !== status || lastTurn !== turn)) {
    // console.log('store changed', { lastTurn, turn, lastStatus, status })
  
    if (mode === PLAY_MODE_X_VS_BOT && turn === MARK_O) {
      setTimeout(() => {
        store.dispatch(mark({ bot: true, onWin, onDraw }))}, 
        Math.floor(Math.random() * 5) * 100 + 200)
    } else if (mode === PLAY_MODE_BOT_VS_BOT && [STATUS_INIT, STATUS_PLAYING].includes(status)) {
      setTimeout(() => {
        store.dispatch(mark({ bot: true, onWin, onDraw }))}, 
        Math.floor(Math.random() * 10) * 50 + 200)
    } else if (mode === PLAY_MODE_DEMO && [STATUS_INIT, STATUS_PLAYING].includes(status)) {
      demoActionTimeout = setTimeout(() => {
        store.dispatch(mark({ bot: true, onWin, onDraw }))}, 
        Math.floor(Math.random() * 10) * 100 + 500)
    }
  }

  lastTurn = turn
  lastStatus = status
}

function Game({ onWin, onDraw, demoMode = false }) {
  const dispatch = useDispatch()
  const store = useStore()
  const turn = useSelector(selectTurn)
  const grid = useSelector(selectGridData)
  const mode = useSelector(selectMode)
  const status = useSelector(selectStatus)
  
  useEffect(() => {
    const unsubscribe = store.subscribe(() => stateChanged(store, onWin, onDraw))

    if (demoMode && status === STATUS_INIT) {
      dispatch(reset({ mode: PLAY_MODE_DEMO }))
    } else if (!demoMode && mode !== PLAY_MODE_DEMO && demoActionTimeout) {
      clearTimeout(demoActionTimeout)
    }

    return unsubscribe
  });

  let canClick = (mode === PLAY_MODE_LOCAL) ||
                 (mode === PLAY_MODE_X_VS_BOT && turn === MARK_X) ||
                 (mode === PLAY_MODE_O_VS_BOT && turn === MARK_O)

  return (
    <div className={`tic-tac-toe Game${demoMode ? ' demoMode' : ''}`}>
      <Grid 
        gridData={grid} 
        turn={canClick ? turn : undefined}
        onClick={(row, col) => canClick && dispatch(mark({ row, col, onWin, onDraw }))} />
    </div>
  )
}

export default Game
