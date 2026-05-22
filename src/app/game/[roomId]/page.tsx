import GameCanvas from "@/components/GameCanvas";

type GameRoomPageProps = {
  params: Promise<{
    roomId: string;
  }>;
  searchParams: Promise<{
    name?: string;
  }>;
};

export default async function GameRoomPage({
  params,
  searchParams,
}: GameRoomPageProps) {
  const { roomId } = await params;
  const { name } = await searchParams;

  return <GameCanvas roomId={roomId} name={name || "Player"} />;
}
