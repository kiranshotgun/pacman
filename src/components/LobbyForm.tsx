"use client";

import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LobbyForm() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("demo-room");
  const [name, setName] = useState("Player");

  function createRoom() {
    const id = nanoid(6);
    router.push(`/game/${id}?name=${encodeURIComponent(name.trim() || "Player")}`);
  }

  function joinRoom() {
    const id = roomId.trim() || "demo-room";
    router.push(`/game/${id}?name=${encodeURIComponent(name.trim() || "Player")}`);
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-yellow-300/45 bg-zinc-950 p-6 shadow-xl shadow-yellow-300/10">
      <h1 className="mb-6 text-3xl font-bold text-yellow-300">
        Multiplayer Pac-Man
      </h1>

      <label className="mb-2 block text-sm font-medium text-zinc-300">
        Your name
      </label>
      <input
        className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white outline-none transition focus:border-yellow-300"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <button
        onClick={createRoom}
        className="mb-6 w-full rounded-lg bg-yellow-300 p-3 font-bold text-black transition hover:bg-yellow-200"
      >
        Create New Room
      </button>

      <label className="mb-2 block text-sm font-medium text-zinc-300">
        Room ID
      </label>
      <input
        className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white outline-none transition focus:border-yellow-300"
        value={roomId}
        onChange={(event) => setRoomId(event.target.value)}
      />

      <button
        onClick={joinRoom}
        className="w-full rounded-lg border border-yellow-300 p-3 font-bold text-yellow-200 transition hover:bg-yellow-300 hover:text-black"
      >
        Join Room
      </button>
    </section>
  );
}
