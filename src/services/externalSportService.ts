import axios from 'axios';

const SPORT_BASE_URL = 'https://omegatech-api.dixonomega.tech/api/Sport';

export const externalSportService = {
  async getSportTrend(page: number = 1) {
    try {
      const response = await axios.get(`${SPORT_BASE_URL}/sport-trend`, {
        params: { page }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching sport trends:', error);
      throw error;
    }
  },

  async getMatchDetail(id: string) {
    try {
      const response = await axios.get(`${SPORT_BASE_URL}/match-detail`, {
        params: { id }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching match detail:', error);
      throw error;
    }
  },

  async getSportFeeds() {
    try {
      const response = await axios.get(`${SPORT_BASE_URL}/sport-feeds`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sport feeds:', error);
      throw error;
    }
  }
};
