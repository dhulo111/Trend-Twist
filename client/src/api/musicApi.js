import axios from 'axios';

const ITUNES_API_URL = 'https://itunes.apple.com/search';

/**
 * Search for music tracks using iTunes Search API
 * @param {string} query - The search term (e.g., "Taylor Swift")
 * @returns {Promise<Array>} - List of tracks
 */
export const searchMusic = async (query) => {
  if (!query) return [];
  
  try {
    const response = await axios.get(ITUNES_API_URL, {
      params: {
        term: query,
        media: 'music',
        entity: 'song',
        limit: 20,
      },
    });

    if (response.data && response.data.results) {
      return response.data.results.map((track) => ({
        id: track.trackId,
        title: track.trackName,
        artist: track.artistName,
        previewUrl: track.previewUrl,
        coverUrl: track.artworkUrl100, // 100x100 cover
        duration: track.trackTimeMillis,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching music:", error);
    return [];
  }
};
