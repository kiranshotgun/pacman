import { addPlayer, removePlayer, setPlayerDirection } from "./engine";
import type { ClientMessage, GameState } from "./types";

export function applyClientMessage(
  state: GameState,
  message: ClientMessage,
): GameState {
  switch (message.type) {
    case "join":
      return addPlayer(state, message.playerId, message.name);
    case "input":
      return setPlayerDirection(state, message.playerId, message.direction);
    case "leave":
      return removePlayer(state, message.playerId);
    default:
      return state;
  }
}
