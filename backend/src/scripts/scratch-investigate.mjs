async function test() {
  const query = `query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      idMal
      status
      episodes
      nextAiringEpisode { episode airingAt timeUntilAiring }
      title { english romaji }
    }
  }`;
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: 21 } })
  });
  const data = await res.json();
  console.log('AniList One Piece (21):', JSON.stringify(data, null, 2));

  // Also query Jikan / MAL for One Piece (21)
  const jikanRes = await fetch('https://api.jikan.moe/v4/anime/21');
  const jikanData = await jikanRes.json();
  console.log('Jikan One Piece (21):', {
    status: jikanData.data?.status,
    episodes: jikanData.data?.episodes,
    airing: jikanData.data?.airing,
    title: jikanData.data?.title,
  });

  // Check Jikan episodes endpoint
  const jikanEpRes = await fetch('https://api.jikan.moe/v4/anime/21/episodes');
  const jikanEpData = await jikanEpRes.json();
  console.log('Jikan One Piece episodes sample:', {
    pagination: jikanEpData.pagination,
    count: jikanEpData.data?.length,
    first: jikanEpData.data?.[0],
    last: jikanEpData.data?.[jikanEpData.data?.length - 1]
  });
}

test().catch(console.error);
