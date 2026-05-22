import * as Ably from "ably";

export function createAblyClient(clientId: string) {
  return new Ably.Realtime({
    authUrl: `/api/ably-token?clientId=${encodeURIComponent(clientId)}`,
    clientId,
  });
}
