/* global naver */
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MapService from '../../services/MapService';
import getRouteService from '../../services/RouteServiceSingleton';
import './TrackingScreen.css';

/* --- 거리 계산 유틸 --- */
const toRad = d => (d * Math.PI) / 180;
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const fmtDist = m => (m < 1000 ? `${m}m` : `${(m/1000).toFixed(1)}km`);
const fmtTime = s => {
  const m = Math.floor(s/60);
  return m < 60 ? `${m}분` : `${Math.floor(m/60)}시간 ${m%60}분`;
};

export default function TrackingScreen() {
  const { state } = useLocation();
  const {
    startLocation,
    destination,
    routeInfo,
    routeType = 'normal',
  } = state || {};
  const navigate = useNavigate();

  const mapRef          = useRef(null);
  const mapServiceRef   = useRef(null);
  const routeServiceRef = useRef(null);
  const watchIdRef      = useRef(null);
  const currentLocRef   = useRef(null);
  const totalDistRef    = useRef(routeInfo?.distance || 0);

  const [remain, setRemain] = useState(routeInfo?.distance || 0);
  const [eta,    setEta]    = useState(routeInfo?.time     || 0);
  const [locBtn, setLocBtn] = useState(false);

  // 경로 없으면 복귀
  useEffect(() => {
    if (!startLocation || !destination) {
      alert('경로 정보가 없습니다.');
      navigate('/route');
    }
  }, [startLocation, destination, navigate]);

  // 맵 + 경로 초기화
  useEffect(() => {
    if (!mapRef.current || !startLocation || !destination) return;

    // 1) MapService
    mapServiceRef.current = new MapService(
      mapRef.current,
      startLocation.coords
    );
    const map = mapServiceRef.current.getMapInstance();

    // 2) RouteService 싱글턴
    routeServiceRef.current = getRouteService(map);

    // 3) tilesloaded 한 번 듣고 그리기
    const tileListener = naver.maps.Event.addListener(map, 'tilesloaded', async () => {
      // 한 번만 실행
      naver.maps.Event.removeListener(tileListener);

      try {
        const info = await routeServiceRef.current.drawRoute(
          startLocation.coords,
          destination.coords,
          routeType
        );
        if (info) {
          totalDistRef.current = info.distance;
          setRemain(info.distance);
          setEta(info.time);
        }
      } catch (err) {
        console.error('drawRoute 실패:', err);
      }
    });

    // 4) 위치 추적 시작
    startTracking();

    // 정리
    return () => {
      stopTracking();
      naver.maps.Event.removeListener(tileListener);
      // routeServiceRef.current.clearMap(); // 필요 시
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startLocation, destination, routeType]);

  // 위치 추적 중지
  const stopTracking = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // 위치 추적 시작
  const startTracking = useCallback(() => {
    if (watchIdRef.current || !navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude, longitude, accuracy } = coords;
        if (accuracy > 50) return;

        // 거의 동일 위치면 무시
        if (
          currentLocRef.current &&
          Math.abs(currentLocRef.current.latitude  - latitude)  < 1e-5 &&
          Math.abs(currentLocRef.current.longitude - longitude) < 1e-5
        ) return;

        currentLocRef.current = { latitude, longitude };
        mapServiceRef.current?.updateCurrentLocation(currentLocRef.current, true);

        const dist = haversine(
          latitude, longitude,
          destination.coords.latitude,
          destination.coords.longitude,
        );
        setRemain(Math.round(dist));
        setEta(Math.round(dist / 1.4));

        if (dist < 20) {
          stopTracking();
          alert('목적지에 도착했습니다!');
        }
      },
      err => console.error('watchPosition 오류', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  }, [destination, stopTracking]);

  return (
    <div className="tracking-screen">
      {/* 헤더 */}
      <div className="tracking-header">
        <button
          className="tracking-back-button"
          onClick={() => {
            stopTracking();
            navigate(-1);
          }}
        >
          <img src="/images/RouteSelectionScreen/back.png" alt="뒤로 가기" />
        </button>
        <div className="destination-info">
          <h3>{destination?.name || '목적지'}</h3>
          <span>{fmtDist(remain)} 남음 · 도착 {fmtTime(eta)}</span>
        </div>
      </div>

      {/* 지도 */}
      <div className="tracking-map-container" ref={mapRef} />

      {/* 현재 위치 버튼 */}
      <div className="tracking-location-btn-container">
        <button
          className={`tracking-location-btn ${locBtn ? 'active' : ''}`}
          onClick={() => {
            if (mapServiceRef.current && currentLocRef.current) {
              setLocBtn(true);
              mapServiceRef.current.panTo(currentLocRef.current, 17);
              setTimeout(() => setLocBtn(false), 3000);
            }
          }}
        >
          {locBtn && <div className="tracking-location-pulse" />}
          <img
            src="/images/RouteSelectionScreen/location.svg"
            alt="현재 위치"
          />
        </button>
      </div>
    </div>
  );
}
