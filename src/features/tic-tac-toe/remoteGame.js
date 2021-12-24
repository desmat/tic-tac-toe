import * as firestore from "firebase/firestore"
import * as firebase from '../../firebase'
import { STATUS_INIT, STATUS_PLAYING } from './gameSlice'

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

function cleanupGameDoc(gameId, player) {
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

function updateGameDoc(gameId, player, data = {}, onError) {
  // console.log('updating game', { gameId, player })
  firestore.updateDoc(firestore.doc(firebase.db, COLLECTION_NAME, gameId), { 
    [`player_${player}_updated`]: firestore.serverTimestamp(),
    ...data,
  }).then((ref) => {
    // console.log('updated game', { gameId })
  }).catch((error) => {
    if (onError) {
      onError(error)
    } else {
      console.error('error updating game', error)
    }
  })
}

export function startRemoteGame({ gameId, player, onRemotePlayerMove, onRemotePlayerDisconnected }) {
  // console.log('startRemoteGame', { gameId, player })

  let lastMove
  const cleanupOnSnapshot = firestore.onSnapshot(firestore.doc(firebase.db, COLLECTION_NAME, gameId), (snapshot) => {
    // console.log('Game onSnapshot', snapshot.data())
    if (snapshot && snapshot.data()) {
      const { 
        status,
        moves,
        [`player_${player === 'x' ? 'o' : 'x'}_updated`]: remotePlayerUpdated,
      } = snapshot.data()
      const move = moves && moves.length > 0 ? moves[moves.length - 1] : undefined
      
      if (move !== lastMove) {
        // console.log('Game onSnapshot', { move })
        lastMove = move
        const remotePlayer = moves.length % 2 ? 'x' : 'o' // x is always odd
        const row = Math.floor(move / 3)
        const col = move - (row * 3)

        // console.log('Game onSnapshot: dispatch mark', { player, row, col })
        onRemotePlayerMove && remotePlayer !== player && onRemotePlayerMove({ gameId, player, row, col })
      } else if ([STATUS_INIT, STATUS_PLAYING].includes(status) && calcPlayerStatus(remotePlayerUpdated) !== PLAYER_STATUS_CURRENT) {
        // console.log('Remote player disconnected', { gameId, player, remotePlayerUpdated, status })
        onRemotePlayerDisconnected && onRemotePlayerDisconnected({ gameId, player })
      }
    }
  }) 

  // join the game
  updateGameDoc(gameId, player)

  // keep current player fresh
  const pingInterval = setInterval(() => {
    // console.log('updating game', { gameId, player })
    updateGameDoc(gameId, player, {}, () => {clearInterval(pingInterval)})
  }, UPDATE_GAME_INTERVAL)  

  return () => {
    // console.log('startRemoteGame cleanup', { gameId })
    cleanupOnSnapshot()
    clearInterval(pingInterval)
    cleanupGameDoc(gameId, player)
  }
}

export function joinRemoteGame({ gameId, player, onSuccess }) {
  // console.log('joinRemoteGame', { gameId, player , onSuccess})

    // join the game
  updateGameDoc(gameId, player, { status: STATUS_PLAYING })

  if (onSuccess) {
    return onSuccess(gameId, player)
  }
}

export function createRemoteGame({ onSuccess, onRemotePlayerJoined }) {
  // console.log('createRemoteGame', {})
  let gameId, cleanupOnSnapshot, pingInterval

  firestore.addDoc(firestore.collection(firebase.db, COLLECTION_NAME), {
    created: firestore.serverTimestamp(),
    player_x_updated: firestore.serverTimestamp(), 
    status: STATUS_INIT,
  }).then((ref) => {
    gameId = ref.id    
    onSuccess && onSuccess(gameId)

    // keep an eye out for player_o to join
    cleanupOnSnapshot = firestore.onSnapshot(ref, (snapshot) => {
      // console.log('watching newly created game: snapshot', snapshot.data())
      const remotePlayerStatus = calcPlayerStatus(snapshot.data().player_o_updated)

      if ([PLAYER_STATUS_CURRENT, PLAYER_STATUS_STALE].includes(remotePlayerStatus)) {
        // start the game as player_x
        joinRemoteGame({ gameId: ref.id, player: 'x', onSuccess: () => {
          // switching from waiting menu to play mode triggers the cleanup below;
          // don't cleanup player_x_updated in this case otherwise the remote player_o
          // will intepret as player_x disconnecting
          gameId = undefined 
          onRemotePlayerJoined(ref.id, 'x')
        }})
      }
    })

    // keep this game fresh
    pingInterval = setInterval(() => {
      updateGameDoc(gameId, 'x', {}, () => {clearInterval(pingInterval)})
    }, UPDATE_GAME_INTERVAL)            
  }).catch((error) => {
    console.error('error creating game', error)
  })

  return () => {
    // console.log('createRemoteGame cleanup', {})
    if (cleanupOnSnapshot) cleanupOnSnapshot()
    if (pingInterval) clearInterval(pingInterval)
    if (gameId) cleanupGameDoc(gameId, 'x')
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

        if (status === STATUS_INIT && [PLAYER_STATUS_CURRENT /*, PLAYER_STATUS_STALE */].includes(remotePlayerStatus)) {
          // console.log('entry', { age: entryAge, status: entryStatus })
          // setGames([...games, doc.id])
          updatedGames.push(doc.id)
        }
      }
    })  
    
    onFoundGames(updatedGames)
  })

  return () => {
    // console.log('findRemoteGames cleanup', { gameId })
    if (cleanupOnSnapshot) cleanupOnSnapshot()
  }

}

export function recordRemoteGameMove({ gameId, player, moves, status }) {
  updateGameDoc(gameId, player, { moves, status })
}