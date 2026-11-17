// @ts-nocheck
globalThis.window = globalThis

import { getAnimeById } from '../src/services/anilist.js'

async function run() {
  console.log('Fetching anime 21 (One Piece)...')
  try {
    const anime = await getAnimeById(21)
    console.log('Anime result:', {
      id: anime.id,
      title: anime.title,
      totalEpisodes: anime.totalEpisodes,
      episodesListLength: anime.episodesList?.length,
      firstEp: anime.episodesList?.[0],
      lastEp: anime.episodesList?.[anime.episodesList?.length - 1],
      status: anime.status,
    })
  } catch (err) {
    console.error('Error fetching One Piece:', err)
  }
}

run()
