// Configuration commits and session admission share this queue. A connection
// cannot authenticate against a membership set that is being replaced.
const operations = new Map<string, Promise<unknown>>();

export async function withRoomOperation<T>(
  roomId: string,
  run: () => Promise<T>,
): Promise<T> {
  const previous = operations.get(roomId);
  const current = (previous ?? Promise.resolve()).catch(() => {}).then(run);
  operations.set(roomId, current);
  try {
    return await current;
  } finally {
    if (operations.get(roomId) === current) operations.delete(roomId);
  }
}
