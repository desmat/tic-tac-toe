import * as firestore from "firebase/firestore"
import * as firebase from '../../firebase'
import { STATUS_INIT, STATUS_WAITING, STATUS_PLAYING, STATUS_ABORTED } from './gameSlice'

const COLLECTION_NAME = `tic-tac-toe-games`

const [PLAYER_STATUS_CURRENT, PLAYER_STATUS_STALE, PLAYER_STATUS_EXPIRED] = ['CURRENT', 'STALE', 'EXPIRED']

const PLAYER_STATUS_THRESHOLD_STALE = 10

const PLAYER_STATUS_THRESHOLD_EXPIRED = 30

const UPDATE_GAME_INTERVAL = 5 * 1000

function calcPlayerStatus(lastUpdated) {
  const now = new Date().getTime()
  var age = lastUpdated ? Math.floor(now/1000) - lastUpdated.seconds : undefined
  
  if ((typeof age == 'undefined') || age >= PLAYER_STATUS_THRESHOLD_EXPIRED) {
    return PLAYER_STATUS_EXPIRED
  } else if (age >= PLAYER_STATUS_THRESHOLD_STALE) {
    return PLAYER_STATUS_STALE
  } else {
    return PLAYER_STATUS_CURRENT
  }
}

async function cleanupGameDoc(gameId, player) {
  // console.log('cleanupGameDoc', { gameId, player })
  firestore.getDoc(firestore.doc(firebase.db, COLLECTION_NAME, gameId)).then((gameDoc) => {
    if (gameDoc && gameDoc.data()) {
      const otherPlayerLastUpdated = player === 'x' ? gameDoc.data().player_o_updated : gameDoc.data().player_x_updated
      const otherPlayerStatus = calcPlayerStatus(otherPlayerLastUpdated)
      if (otherPlayerStatus === PLAYER_STATUS_CURRENT && player) {
        // opponent still connected
        firestore.updateDoc(gameDoc.ref, { 
          [`player_${player}_updated`]: null
        }).then(() => {
          // console.log('cleanupGameDoc updated', { gameId, player })
        }).catch((error) => {
          console.error('Error cleaning up game doc', { gameId, player, error })
        })
      } else {
        // opponent already left, kill the record
        firestore.deleteDoc(gameDoc.ref).then(() => {
          // console.log('cleanupGameDoc deleted', { gameId, player })
        }).catch((error) => {
          console.error('Error deleting game doc', { gameId, player, error })
        })
      }
    }
  }).catch((error) => {
    console.error('error getting game doc', { gameId, player, error })
  })
}

async function updateGameDoc(gameId, player, data = {}, onError) {
  // console.log('updateGameDoc', JSON.stringify({ gameId, player, data }))

  return firestore.updateDoc(firestore.doc(firebase.db, COLLECTION_NAME, gameId), { 
    [`player_${player}_updated`]: firestore.serverTimestamp(),
    [`player_${player}_uid`]: firebase.auth && firebase.auth.currentUser && firebase.auth.currentUser.uid,
    ...data,
  }).catch((error) => {
    if (onError) {
      onError(error)
    } else {
      console.error('error updating game', error)
    }
  })
}

export async function getRemoteGame({ gameId, onRemotePlayerMove, onRemotePlayerConnected, onRemotePlayerDisconnected, onError }) {
  // console.log('getRemoteGame', { gameId })

  const doc = await firestore.getDoc(firestore.doc(firebase.db, COLLECTION_NAME, gameId))
    
  if (!doc.exists()) {
    onError && onError({ gameId, error: 'Remote game not found' })
  // } else if (...) {
  //   // TODO check for completed/outdated game docs
  } else if (doc && doc.data()) {
    return doc.data()
  }
}

export async function startRemoteGame({ gameId, player, onRemotePlayerMove, onRemotePlayerConnected, onRemotePlayerDisconnected, onError }) {
  // console.log('startRemoteGame', { gameId, player })

  const doc = await firestore.getDoc(firestore.doc(firebase.db, COLLECTION_NAME, gameId))
    
  if (!doc.exists()) {
    onError && onError({ gameId, error: 'Remote game not found' })
  // } else if (...) {
  //   // TODO check for completed/outdated game docs
  } else {
    let lastMove, lastRemotePlayerId
    const cleanupOnSnapshot = firestore.onSnapshot(firestore.doc(firebase.db, COLLECTION_NAME, gameId), (snapshot) => {
      // console.log('startRemoteGame onSnapshot', JSON.stringify({ gameId, player, data: snapshot && snapshot.data() }))
      if (snapshot && snapshot.data()) {
        const remotePlayer = player === 'x' ? 'o' : 'x'
        const { 
          status,
          moves,
          [`player_${remotePlayer}_updated`]: remotePlayerUpdated,
          [`player_${remotePlayer}_uid`]: remotePlayerId,
        } = snapshot.data()
        const move = moves && moves.length > 0 ? moves[moves.length - 1] : undefined
        
        if (remotePlayerId !== lastRemotePlayerId) {
          lastRemotePlayerId = remotePlayerId
          let updatedStatus = status
          if (status === STATUS_WAITING && remotePlayerUpdated) {
            updatedStatus = STATUS_PLAYING
            updateGameDoc(gameId, player, { status: updatedStatus })
          }
          onRemotePlayerConnected && onRemotePlayerConnected({ gameId, player: remotePlayer, status: updatedStatus })
        }
        
        if (move !== lastMove) {
          // console.log('Game onSnapshot', { move })
          lastMove = move
          const remotePlayer = moves.length % 2 ? 'x' : 'o' // x is always odd
          const row = Math.floor(move / 3)
          const col = move - (row * 3)
  
          // console.log('Game onSnapshot: dispatch mark', { player, row, col })
          onRemotePlayerMove && remotePlayer !== player && onRemotePlayerMove({ gameId, player, row, col })
        } 
        
        if ([STATUS_PLAYING].includes(status) && calcPlayerStatus(remotePlayerUpdated) !== PLAYER_STATUS_CURRENT) {
          // console.log('startRemoteGame onSnapshot: remote player disconnected', { gameId, player, remotePlayerUpdated, status })
          updateGameDoc(gameId, player, { status: STATUS_ABORTED })
          onRemotePlayerDisconnected && onRemotePlayerDisconnected({ gameId, player: remotePlayer, status: STATUS_ABORTED })
        }
      }
    }) 
  
    const { 
      status,
      [`player_${player}_updated`]: playerUpdated,
      [`player_${player === 'x' ? 'o' : 'x'}_updated`]: remotePlayerUpdated,
    } = doc.data()

    // console.log('startRemoteGame joining game', { gameId, player, status, playerUpdated, remotePlayerUpdated })

    const updateGameData = { status }
    if (status === STATUS_INIT && playerUpdated && !remotePlayerUpdated) {
      updateGameData.status = STATUS_WAITING
    } else if (status === STATUS_WAITING && playerUpdated && remotePlayerUpdated) {
      updateGameData.status = STATUS_PLAYING
    }
    updateGameDoc(gameId, player, updateGameData)

    // keep current player fresh
    const pingInterval = setInterval(() => {
      // console.log('startRemoteGame: pingInterval: updating game', { gameId, player })
      updateGameDoc(gameId, player, {}, () => {clearInterval(pingInterval)})
    }, UPDATE_GAME_INTERVAL)  
  
    return {
      gameId, 
      player,
      status: updateGameData.status,
      cleanup: () => {
        // console.log('startRemoteGame cleanup', { gameId, player })
        cleanupOnSnapshot()
        clearInterval(pingInterval)
        cleanupGameDoc(gameId, player)
      }
    }
  }
}

export async function createRemoteGame() {
  // console.log('createRemoteGame', {})

  const ref = await firestore.addDoc(firestore.collection(firebase.db, COLLECTION_NAME), {
    created: firestore.serverTimestamp(),
    player_x_updated: firestore.serverTimestamp(), 
    status: STATUS_INIT
  }).catch((error) => {
    console.error('Error creating remote game', error)
  })

  return {
    gameId: ref.id,
  }
}

export function findRemoteGames(onFoundGames) {
  const cleanupOnSnapshot = firestore.onSnapshot(firestore.collection(firebase.db, COLLECTION_NAME), (snapshot) => {
    // console.log('findRemoteGames onSnapshot')
    const updatedGames = []
    snapshot.docs.forEach((doc) => {
      if (doc && doc.data()) {
        const { player_x_updated, status } = doc.data()  
        const remotePlayerStatus = calcPlayerStatus(player_x_updated)

        if (status === STATUS_WAITING && [PLAYER_STATUS_CURRENT /*, PLAYER_STATUS_STALE */].includes(remotePlayerStatus)) {
          // console.log('entry', { age: entryAge, status: entryStatus })
          // setGames([...games, doc.id])
          updatedGames.push(doc.id)
        }
      }
    })  
    
    onFoundGames(updatedGames)
  })

  return cleanupOnSnapshot
}

export async function recordRemoteGameMove({ gameId, player, moves, status }) {
  // console.log('recordRemoteGameMove', { gameId, player, moves, status })
  updateGameDoc(gameId, player, { moves, status })
}