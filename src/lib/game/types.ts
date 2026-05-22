export type Direction = "up" | "down" | "left" | "right" | "none";

export type Player = {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  nextDirection: Direction;
  score: number;
  color: string;
  alive: boolean;
};

export type Ghost = {
  id: string;
  x: number;
  y: number;
  direction: Direction;
};

export type GameStatus = "waiting" | "playing" | "won" | "ended";

export type GameState = {
  roomId: string;
  hostId: string | null;
  status: GameStatus;
  players: Record<string, Player>;
  ghosts: Ghost[];
  pellets: Record<string, boolean>;
  tick: number;
};

export type ClientMessage =
  | {
      type: "join";
      playerId: string;
      name: string;
    }
  | {
      type: "input";
      playerId: string;
      direction: Direction;
    }
  | {
      type: "leave";
      playerId: string;
    };

export type ServerMessage =
  | {
      type: "state";
      state: GameState;
    }
  | {
      type: "host";
      hostId: string;
    };
