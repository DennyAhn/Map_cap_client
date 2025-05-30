/* global naver */
import RouteService from './RouteService';

let instance = null;

/** 앱 전체에서 RouteService 하나만 공유하도록 보장 */
export default function getRouteService(mapInstance) {
  if (!instance) {
    instance = new RouteService(mapInstance);
  } else if (mapInstance && instance.mapInstance !== mapInstance) {
    // 다른 화면에서 새 map 객체를 넘기면 내부 map 교체
    instance.mapInstance = mapInstance;
  }
  return instance;
}

/** 필요할 때 전역 캐시 비우기 */
export const resetRouteCache = () => {
  if (instance && RouteService.globalCache) {
    RouteService.globalCache.clear();
  }
};
