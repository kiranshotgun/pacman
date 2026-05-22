import { PLAYER_COLORS } from "./constants";
import { createPellets, isWall, remainingPellets } from "./map";
import type { Direction, GameState, Player } from "./types";

const SPAWN_POINTS = [
  { x: 1, y: 1 },
  { x: 17, y: 1 },
  { x: 1, y: 19 },
  { x: 17, y: 19 },
];

export function createInitialState(roomId: string): GameState {
  return {
    roomId,
    hostId: null,
    status: "waiting",
    players: {},
    ghosts: [
      {
        id: "ghost-1",
        x: 9,
        y: 10,
        direction: "left",
      },
    ],
    pellets: createPellets(),
    tick: 0,
  };
}

export function addPlayer(
  state: GameState,
  playerId: string,
  name: string,
): GameState {
  if (state.players[playerId]) return state;

  const playerCount = Object.keys(state.players).length;
  if (playerCount >= SPAWN_POINTS.length) return state;

  const spawn = SPAWN_POINTS[playerCount];

  const player: Player = {
    id: playerId,
    name,
    x: spawn.x,
    y: spawn.y,
    direction: "none",
    nextDirection: "none",
    score: 0,
    color: PLAYER_COLORS[playerCount % PLAYER_COLORS.length],
    alive: true,
  };

  return {
    ...state,
    hostId: state.hostId ?? playerId,
    status: "playing",
    players: {
      ...state.players,
      [playerId]: player,
    },
  };
}

export function setPlayerDirection(
  state: GameState,
  playerId: string,
  direction: Direction,
): GameState {
  const player = state.players[playerId];
  if (!player) return state;

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        nextDirection: direction,
      },
    },
  };
}

export function removePlayer(state: GameState, playerId: string): GameState {
  if (!state.players[playerId]) return state;

  const players = { ...state.players };
  delete players[playerId];

  const nextHostId =
    state.hostId === playerId ? Object.keys(players)[0] ?? null : state.hostId;
  const hasPlayers = Object.keys(players).length > 0;

  return {
    ...state,
    hostId: nextHostId,
    players,
    status: hasPlayers ? state.status : "waiting",
  };
}

function getNextPosition(x: number, y: number, direction: Direction) {
  switch (direction) {
    case "up":
      return { x, y: y - 1 };
    case "down":
      return { x, y: y + 1 };
    case "left":
      return { x: x - 1, y };
    case "right":
      return { x: x + 1, y };
    default:
      return { x, y };
  }
}

export function stepGame(state: GameState): GameState {
  if (state.status !== "playing") return state;

  const players = { ...state.players };
  const pellets = { ...state.pellets };

  for (const playerId of Object.keys(players)) {
    const player = players[playerId];
    if (!player.alive) continue;

    let direction = player.direction;

    const desired = getNextPosition(player.x, player.y, player.nextDirection);
    if (!isWall(desired.x, desired.y)) {
      direction = player.nextDirection;
    }

    const next = getNextPosition(player.x, player.y, direction);

    let x = player.x;
    let y = player.y;

    if (!isWall(next.x, next.y)) {
      x = next.x;
      y = next.y;
    }

    const pelletKey = `${x},${y}`;
    const atePellet = Boolean(pellets[pelletKey]);

    if (atePellet) {
      pellets[pelletKey] = false;
    }

    players[playerId] = {
      ...player,
      x,
      y,
      direction,
      score: player.score + (atePellet ? 10 : 0),
    };
  }

  const status = remainingPellets(pellets) === 0 ? "won" : state.status;

  return {
    ...state,
    players,
    pellets,
    status,
    tick: state.tick + 1,
  };
}
