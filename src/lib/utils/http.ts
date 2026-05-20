export async function parseJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
