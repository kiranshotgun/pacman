"use client";

import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";
import type { Message, PresenceMessage, RealtimeChannel } from "ably";
import {
  BOARD,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  TILE_SIZE,
  TICK_RATE,
} from "@/lib/game/constants";
import { createInitialState, removePlayer, stepGame } from "@/lib/game/engine";
import { applyClientMessage } from "@/lib/game/reducer";
import type {
  ClientMessage,
  Direction,
  GameState,
  ServerMessage,
} from "@/lib/game/types";
import { createAblyClient } from "@/lib/realtime/ablyClient";

type Props = {
  roomId: string;
  name: string;
};

type PresenceData = {
  playerId?: string;
  name?: string;
  joinedAt?: number;
};

const keyToDirection: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

function isConnectionClosedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return message.toLowerCase().includes("connection closed");
}

function reportRealtimeError(error: unknown) {
  if (isConnectionClosedError(error)) return;

  console.error(error);
}

function publishServerState(channel: RealtimeChannel, state: GameState) {
  return channel
    .publish("server", {
      type: "state",
      state,
    } satisfies ServerMessage)
    .catch(reportRealtimeError);
}

function publishClientMessage(channel: RealtimeChannel, message: ClientMessage) {
  return channel.publish("client", message).catch(reportRealtimeError);
}

function getHostFromPresence(members: PresenceMessage[]) {
  return members
    .map((member) => member.data as PresenceData)
    .filter(
      (member): member is Required<PresenceData> =>
        typeof member.playerId === "string" &&
        typeof member.name === "string" &&
        typeof member.joinedAt === "number",
    )
    .sort((a, b) => a.joinedAt - b.joinedAt)[0]?.playerId;
}

export default function GameCanvas({ roomId, name }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>(createInitialState(roomId));
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [playerId] = useState(() => nanoid());
  const [joinedAt] = useState(() => Date.now());
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialState(roomId),
  );

  const isHost = gameState.hostId === playerId;

  useEffect(() => {
    let isMounted = true;
    const client = createAblyClient(playerId);
    const channel = client.channels.get(`pacman:room:${roomId}`);
    channelRef.current = channel;

    const syncState = (state: GameState) => {
      stateRef.current = state;
      if (isMounted) setGameState(state);
    };

    const handleClientMessage = (message: Message) => {
      const data = message.data as ClientMessage;

      if (stateRef.current.hostId !== playerId) return;

      const nextState = applyClientMessage(stateRef.current, data);
      stateRef.current = nextState;

      if (data.type === "join" || data.type === "leave") {
        syncState(nextState);
        void publishServerState(channel, nextState);
      }
    };

    const handleServerMessage = (message: Message) => {
      const data = message.data as ServerMessage;

      if (data.type === "state") {
        syncState(data.state);
      }
    };

    async function electInitialHost() {
      const members = await channel.presence.get();
      const electedHostId = getHostFromPresence(members);

      if (!isMounted || electedHostId !== playerId || stateRef.current.hostId) {
        return;
      }

      const initialState = applyClientMessage(stateRef.current, {
        type: "join",
        playerId,
        name,
      });

      syncState(initialState);
      void publishServerState(channel, initialState);
    }

    async function setupRoom() {
      await Promise.all([
        channel.subscribe("client", handleClientMessage),
        channel.subscribe("server", handleServerMessage),
      ]);

      await channel.presence.enter({
        playerId,
        name,
        joinedAt,
      } satisfies Required<PresenceData>);

      await electInitialHost();

      void publishClientMessage(channel, {
        type: "join",
        playerId,
        name,
      });
    }

    void setupRoom().catch((error: unknown) => {
      if (isMounted) reportRealtimeError(error);
    });

    return () => {
      isMounted = false;
      channelRef.current = null;

      const nextState =
        stateRef.current.hostId === playerId
          ? removePlayer(stateRef.current, playerId)
          : null;

      if (nextState) {
        stateRef.current = nextState;
      }

      const publishTasks = [
        nextState ? publishServerState(channel, nextState) : Promise.resolve(),
        publishClientMessage(channel, {
          type: "leave",
          playerId,
        }),
      ];

      channel.unsubscribe("client", handleClientMessage);
      channel.unsubscribe("server", handleServerMessage);

      void Promise.allSettled(publishTasks)
        .then(() => channel.presence.leave())
        .catch(reportRealtimeError)
        .finally(() => {
          if (
            client.connection.state !== "closed" &&
            client.connection.state !== "closing"
          ) {
            client.close();
          }
        });
    };
  }, [joinedAt, name, playerId, roomId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (stateRef.current.hostId !== playerId) return;

      const nextState = stepGame(stateRef.current);
      stateRef.current = nextState;
      setGameState(nextState);

      if (channelRef.current) {
        publishServerState(channelRef.current, nextState);
      }
    }, 1000 / TICK_RATE);

    return () => window.clearInterval(interval);
  }, [playerId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const direction = keyToDirection[event.key];

      if (!direction || !channelRef.current || event.repeat) return;

      event.preventDefault();

      void publishClientMessage(channelRef.current, {
        type: "input",
        playerId,
        direction,
      });
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playerId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = BOARD_WIDTH * TILE_SIZE;
    canvas.height = BOARD_HEIGHT * TILE_SIZE;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < BOARD.length; y++) {
      for (let x = 0; x < BOARD[y].length; x++) {
        const tile = BOARD[y][x];

        if (tile === "#") {
          context.fillStyle = "#1d4ed8";
          context.fillRect(
            x * TILE_SIZE,
            y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
          );
        }

        if (gameState.pellets[`${x},${y}`]) {
          context.fillStyle = "#f8fafc";
          context.beginPath();
          context.arc(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            3,
            0,
            Math.PI * 2,
          );
          context.fill();
        }
      }
    }

    for (const ghost of gameState.ghosts) {
      context.fillStyle = "#ef4444";
      context.beginPath();
      context.arc(
        ghost.x * TILE_SIZE + TILE_SIZE / 2,
        ghost.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 2.4,
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    for (const player of Object.values(gameState.players)) {
      context.fillStyle = player.color;
      context.beginPath();
      context.arc(
        player.x * TILE_SIZE + TILE_SIZE / 2,
        player.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 2.3,
        0.25 * Math.PI,
        1.75 * Math.PI,
      );
      context.lineTo(
        player.x * TILE_SIZE + TILE_SIZE / 2,
        player.y * TILE_SIZE + TILE_SIZE / 2,
      );
      context.fill();
    }
  }, [gameState]);

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-yellow-300">
              Room: {roomId}
            </h1>
            <p className="text-sm text-zinc-400">
              {name} {isHost ? "is hosting" : "is connected"}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200">
            Status: {gameState.status}
          </div>
        </div>

        <div className="overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4">
          <canvas ref={canvasRef} className="mx-auto block" />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(gameState.players).map((player) => (
            <div
              key={player.id}
              className="rounded-lg border border-zinc-700 bg-zinc-950 p-3"
            >
              <div className="font-bold" style={{ color: player.color }}>
                {player.name}
              </div>
              <div className="text-sm text-zinc-400">Score: {player.score}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
