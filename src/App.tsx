import { Home } from './components/Home'
import { Lobby } from './components/Lobby'
import { Playing } from './components/Playing'
import { Results } from './components/Results'
import { Voting } from './components/Voting'
import { useSocket } from './hooks/useSocket'
import './App.css'

export default function App() {
  const { connected, state, error, api, serverUrl, setServerUrl } = useSocket()

  if (!state) {
    return (
      <Home
        connected={connected}
        error={error}
        serverUrl={serverUrl}
        onServerUrlChange={setServerUrl}
        onCreate={api.createRoom}
        onJoin={api.joinRoom}
        onClearError={api.clearError}
      />
    )
  }

  switch (state.phase) {
    case 'lobby':
      return (
        <Lobby
          state={state}
          onStart={api.startGame}
          onLeave={api.leaveRoom}
          onDuration={api.setDuration}
          error={error}
          onClearError={api.clearError}
        />
      )
    case 'playing':
      return <Playing state={state} />
    case 'voting':
      return (
        <Voting
          state={state}
          onSubmit={api.submitVote}
          error={error}
          onClearError={api.clearError}
        />
      )
    case 'results':
      return (
        <Results
          state={state}
          onNext={api.nextRound}
          onLeave={api.leaveRoom}
          error={error}
          onClearError={api.clearError}
        />
      )
    default:
      return null
  }
}