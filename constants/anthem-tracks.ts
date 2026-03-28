export interface JamendoTrack {
  id: string;
  name: string;
  artist_name: string;
  album_image: string;
  audio: string;
  duration: number;
}

const CLIENT_ID = process.env.EXPO_PUBLIC_JAMENDO_CLIENT_ID ?? "";

export async function searchJamendoTracks(
  query: string,
  offset = 0,
  limit = 20
): Promise<JamendoTrack[]> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    format: "json",
    limit: String(limit),
    offset: String(offset),
    audioformat: "mp32",
    include: "musicinfo",
    ...(query.trim() ? { search: query.trim() } : { order: "popularity_total" }),
  });
  try {
    const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params}`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results ?? []) as JamendoTrack[];
  } catch {
    return [];
  }
}
