/* global naver */
import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ───────── services import ───────── */
import MapService from '../../services/MapService';
import MarkerService from '../../services/MarkerService';
import { getPlacesForFilter } from '../../services/placesApi';

/* ──────────────────────────────────── */
/* 0. 최근 좌표를 복구/폐기하는 헬퍼 함수  */
/* ──────────────────────────────────── */
const getSavedLocation = () => {
  try {
    const raw = sessionStorage.getItem('lastKnownLocation');
    if (!raw) return null;
    const { latitude, longitude, timestamp } = JSON.parse(raw);
    // 48 시간이 지나면 폐기
    if (Date.now() - timestamp > 1000 * 60 * 60 * 48) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
};

const NaverMap = ({
  selectedMode,
  activeFilters,
  setActiveFilters,
  onFilterClick,
  onCurrentLocationUpdate,
  startLocation,
  mapServiceRef,
  userLocation,
}) => {
  /* -------------------------------------------------------------- */
  /*  1. 기본 상태 및 ref                                            */
  /* -------------------------------------------------------------- */
  const mapRef            = useRef(null);
  const mapService        = useRef(null);
  const markerService     = useRef(null);

  const [isMapReady, setIsMapReady] = useState(false);

  const prevActiveFilters = useRef(new Set());
  const userLocationRef   = useRef(null); // 최신 위치 캐싱

  /* -------------------------------------------------------------- */
  /*  2. 지도 + 서비스 초기화 (최초 1회)                              */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    let isSubscribed = true;

    /* 2-1. 네이버맵 스크립트 로드 대기 */
    const waitForNaverMaps = () =>
      new Promise((resolve, reject) => {
        if (window.naver && window.naver.maps) return resolve();
        let tries = 0;
        const id = setInterval(() => {
          if (window.naver && window.naver.maps) {
            clearInterval(id);
            resolve();
          } else if (++tries > 20) {
            clearInterval(id);
            reject(new Error('Naver Maps API 로드 실패'));
          }
        }, 500);
      });

    /* 2-2. MapService·MarkerService 생성 */
    const makeServices = (coords) => {
      /* 인스턴스 생성 */
      mapService.current    = new MapService(mapRef.current, coords);
      markerService.current = new MarkerService();

      if (mapServiceRef) mapServiceRef.current = mapService.current;

      /* 처음 위치 마커 */
      mapService.current.updateCurrentLocation(coords);

      /* ★ 최근 좌표를 세션스토리지에 저장 */
      try {
        sessionStorage.setItem(
          'lastKnownLocation',
          JSON.stringify({ ...coords, timestamp: Date.now() })
        );
      } catch (_) { /* 저장 실패는 무시 */ }

      if (isSubscribed) {
        setIsMapReady(true);
        onCurrentLocationUpdate?.(coords);
      }
    };

    /* 2-3. 실제 초기화 실행 */
    const initializeMap = async () => {
      if (!mapRef.current || mapService.current) return;

      try {
        await waitForNaverMaps();

        /* ★ 1) 세션복구 → 2) 서울시청 좌표 */
        const fallbackCoords =
          getSavedLocation() ?? { latitude: 37.5665, longitude: 126.9780 };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!isSubscribed) return;
              makeServices({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
            },
            () => {
              if (!isSubscribed) return;
              makeServices(fallbackCoords);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
          );
        } else {
          makeServices(fallbackCoords);
        }
      } catch (err) {
        console.error('지도 초기화 오류:', err);
      }
    };

    initializeMap();
    return () => {
      isSubscribed = false;
    };
  }, [mapServiceRef, onCurrentLocationUpdate]);

  /* -------------------------------------------------------------- */
  /*  3. userLocation prop → 현재 위치 마커                          */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    if (userLocation) userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    if (!mapService.current || !userLocation || !isMapReady) return;
    const coords = {
      latitude : userLocation.lat ?? userLocation.latitude,
      longitude: userLocation.lng ?? userLocation.longitude,
    };
    mapService.current.updateCurrentLocation(coords, false);
  }, [userLocation, isMapReady]);

  /* 1초마다 좌표만 살짝 보간 */
  const refreshUserMarker = useCallback(() => {
    if (!mapService.current || !userLocationRef.current || !isMapReady) return;
    const coords = {
      latitude : userLocationRef.current.lat ?? userLocationRef.current.latitude,
      longitude: userLocationRef.current.lng ?? userLocationRef.current.longitude,
    };
    mapService.current.updateCurrentLocation(coords, false);
  }, [isMapReady]);

  useEffect(() => {
    if (!isMapReady) return;
    const id = setInterval(refreshUserMarker, 1000);
    return () => clearInterval(id);
  }, [isMapReady, refreshUserMarker]);

  /* -------------------------------------------------------------- */
  /*  4. 필터 토글 → POI 마커 갱신                                   */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    if (!mapService.current || !markerService.current || !isMapReady) return;

    const mapInstance     = mapService.current.getMapInstance();
    const center          = mapInstance.getCenter();
    const currentLocation = { lat: center.lat(), lng: center.lng() };

    /* 꺼진 필터의 마커 제거 */
    [...prevActiveFilters.current].forEach((filter) => {
      if (!activeFilters.includes(filter)) {
        markerService.current.removeMarkers(filter);
      }
    });

    /* 켜진 필터의 마커 추가/토글 */
    const tasks = activeFilters.map(async (filter) => {
      const places = await getPlacesForFilter(filter, currentLocation);
      if (places?.length) {
        await markerService.current.toggleMarkers(mapInstance, places, filter);
      }
    });

    Promise.all(tasks).then(() => {
      prevActiveFilters.current = new Set(activeFilters);
    });
  }, [activeFilters, isMapReady]);

  /* -------------------------------------------------------------- */
  /*  5. 렌더                                                        */
  /* -------------------------------------------------------------- */
  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
  );
};

export default NaverMap;
