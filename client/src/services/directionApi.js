// src/services/directionApi.js
export const directionRequest = async (start, goal) => {
  const PROXY_URL = 'https://moyak.store';
  const url = `${PROXY_URL}/direction?start=${start}&goal=${goal}`;
  const response = await fetch(url, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("Direction 요청 실패");
  }
  return await response.json();
};
