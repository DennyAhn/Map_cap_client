/* global naver */
import React, { useEffect, useRef, useState } from 'react';

/** services에서 import 경로 수정 */
import MapService from '../../services/MapService';
import MarkerService from '../../services/MarkerService';
import { getPlacesForFilter } from '../../services/placesApi';

const NaverMap = ({ selectedMode, activeFilters, setActiveFilters, onFilterClick, onCurrentLocationUpdate, startLocation, mapServiceRef, userLocation }) => {
  const mapRef = useRef(null);
  const mapService = useRef(null);
  const markerService = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const prevActiveFilters = useRef(new Set());

  // 지도 객체 및 서비스 초기화 (최초 1회 실행 목적, 일회성 현재 위치 가져오기 시도)
  useEffect(() => {
    let isSubscribed = true;

    const waitForNaverMaps = () => {
      return new Promise((resolve, reject) => {
        if (window.naver && window.naver.maps) {
          resolve();
        } else {
          const checkCount = { count: 0 };
          const interval = setInterval(() => {
            if (window.naver && window.naver.maps) {
              clearInterval(interval);
              resolve();
            } else if (checkCount.count > 20) {
              clearInterval(interval);
              reject(new Error('Naver Maps API 로드 실패'));
            }
            checkCount.count++;
          }, 500);
        }
      });
    };

    const initializeMapWithOneTimeLocation = async () => {
      if (!mapRef.current || mapService.current) return;

      try {
        await waitForNaverMaps();
        
        const defaultInitialCoords = { latitude: 37.5665, longitude: 126.9780 };

        const initializeServices = (coords) => {
          mapService.current = new MapService(mapRef.current, coords); // MapService 생성 시 coords로 중심 설정
          markerService.current = new MarkerService();
          
          // MapService 생성 후, 명시적으로 초기 현재 위치 마커 업데이트
          if (mapService.current) {
            mapService.current.updateCurrentLocation(coords); 
          }

          if (mapServiceRef) {
            mapServiceRef.current = mapService.current;
          }
          if (isSubscribed) {
            setIsMapReady(true);
            console.log('NaverMap: 지도가 준비되었습니다. 초기 좌표:', coords);
            if (onCurrentLocationUpdate) {
              onCurrentLocationUpdate(coords); // 일회성으로 가져온 위치 또는 기본 위치 전달
            }
          }
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (!isSubscribed) return;
              const { latitude, longitude } = position.coords;
              console.log('NaverMap: 일회성 현재 위치 가져오기 성공:', { latitude, longitude });
              initializeServices({ latitude, longitude });
            },
            (error) => {
              if (!isSubscribed) return;
              console.warn('NaverMap: 일회성 현재 위치 가져오기 실패. 기본 좌표로 초기화합니다.', error);
              initializeServices(defaultInitialCoords);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 } // maximumAge를 적절히 설정하여 캐시된 위치 활용
          );
        } else {
          console.warn('NaverMap: Geolocation API가 지원되지 않습니다. 기본 좌표로 초기화합니다.');
          initializeServices(defaultInitialCoords);
        }
      } catch (error) {
        console.error('NaverMap: 지도 초기화 중 오류 발생:', error);
        // API 로드 실패 등 심각한 오류 시에도 기본 서비스 초기화 시도 (선택적)
        if (isSubscribed && mapRef.current && !mapService.current) {
           const fallbackCoords = { latitude: 37.5665, longitude: 126.9780 };
           mapService.current = new MapService(mapRef.current, fallbackCoords);
           // MapService 생성 후, 명시적으로 초기 현재 위치 마커 업데이트
           if (mapService.current) {
             mapService.current.updateCurrentLocation(fallbackCoords);
           }
           markerService.current = new MarkerService();
           if (mapServiceRef) mapServiceRef.current = mapService.current;
           setIsMapReady(true); // 지도 준비 상태는 설정
           if (onCurrentLocationUpdate) onCurrentLocationUpdate(fallbackCoords);
        }
      }
    };

    initializeMapWithOneTimeLocation();

    return () => {
      isSubscribed = false;
    };
  }, [mapServiceRef, onCurrentLocationUpdate]); // 의존성 배열: mapServiceRef, onCurrentLocationUpdate


  // userLocation prop (CurrentLocation.js로부터 오는 실시간 위치) 변경 감지 및 지도 업데이트
  useEffect(() => {
    // isMapReady는 MapService 인스턴스가 생성된 이후에 true가 됨
    if (mapService.current && userLocation && isMapReady) {
      console.log('NaverMap (실시간): userLocation 업데이트 수신:', userLocation);
      mapService.current.updateCurrentLocation(userLocation); // 현재 위치 마커 업데이트
      mapService.current.panTo(userLocation); // 지도 중심을 새 userLocation으로 이동
      console.log('NaverMap (실시간): 지도 중심 및 마커를 userLocation으로 업데이트 완료.');
    } else if (mapService.current && !userLocation && isMapReady) {
      console.log('NaverMap (실시간): userLocation이 null입니다.');
      // 실시간 userLocation이 null이 되었을 때의 처리 (예: 마커 제거)
      // mapService.current.clearCurrentLocationMarker(); 
    }
  }, [userLocation, isMapReady]);


  // 필터 변경 감지 및 마커 업데이트
  useEffect(() => {
    if (!mapService.current || !markerService.current || !isMapReady) return;

    const mapInstance = mapService.current.getMapInstance();
    const center = mapInstance.getCenter();
    const currentLocation = {
      lat: center.lat(),
      lng: center.lng()
    };
    
    console.log('필터 상태 변경:', activeFilters);
    
    // 모든 이전 마커를 제거하고 새로운 마커만 추가하는 방식으로 변경
    // 먼저 현재 표시된 모든 카테고리의 마커를 제거
    [...prevActiveFilters.current].forEach(filter => {
      console.log(`${filter} 마커 제거 중...`);
      markerService.current.removeMarkers(filter);
    });
    
    // 그 다음 새로운 활성화된 필터의 마커만 추가
    const addMarkerPromises = [];
    
    activeFilters.forEach(filter => {
      console.log(`${filter} 마커 추가 중...`);
      // Promise 배열에 추가
      addMarkerPromises.push(
        (async () => {
          try {
            const places = await getPlacesForFilter(filter, currentLocation);
            if (places && places.length > 0) {
              console.log(`${filter} ${places.length}개 발견`);
              await markerService.current.toggleMarkers(mapInstance, places, filter);
            } else {
              console.log(`주변에 ${filter} 데이터가 없습니다.`);
            }
          } catch (error) {
            console.error(`Error fetching places for ${filter}:`, error);
          }
        })()
      );
    });
    
    // 모든 마커 추가 작업이 완료된 후 상태 업데이트
    Promise.all(addMarkerPromises).then(() => {
      // 현재 활성화된 필터 상태 저장
      prevActiveFilters.current = new Set(activeFilters);
    });
    
  }, [activeFilters, isMapReady]);

  // 지도 드래그 완료 후 마커 업데이트
  useEffect(() => {
    if (!mapService.current || !markerService.current || !isMapReady || !window.naver) return; // window.naver 확인 추가
    
    const mapInstance = mapService.current.getMapInstance();
    
    // 지도 드래그 이벤트 리스너 추가
    const dragendListener = naver.maps.Event.addListener(mapInstance, 'dragend', () => { // 'naver' 직접 사용() => { // window.naver 사용
      if (activeFilters.length === 0) return; // 활성화된 필터가 없으면 무시
      
      // 지도 중심 위치 가져오기
      const center = mapInstance.getCenter();
      const currentLocation = {
        lat: center.lat(),
        lng: center.lng()
      };
      
      console.log('지도 이동 완료: 현재 중심 위치', currentLocation);
      
      // 활성화된 필터에 대한 마커만 업데이트
      const updateMarkerPromises = [];
      
      activeFilters.forEach(filter => {
        console.log(`지도 이동 후 ${filter} 마커 업데이트 중...`);
        // Promise 배열에 추가
        updateMarkerPromises.push(
          (async () => {
            try {
              // 기존 마커 제거
              markerService.current.removeMarkers(filter);
              
              // 새 위치 기반으로 마커 추가
              const places = await getPlacesForFilter(filter, currentLocation);
              if (places && places.length > 0) {
                console.log(`${filter} ${places.length}개 발견`);
                await markerService.current.toggleMarkers(mapInstance, places, filter);
                
                // 필터 클릭 이벤트 트리거하여 리스트 패널 업데이트
                if (onFilterClick && activeFilters.length === 1) {
                  onFilterClick(filter);
                }
              } else {
                console.log(`현재 위치 주변에 ${filter} 데이터가 없습니다.`);
              }
            } catch (error) {
              console.error(`Error updating places for ${filter}:`, error);
            }
          })()
        );
      });
      
      Promise.all(updateMarkerPromises).then(() => {
        console.log('모든 마커 업데이트 완료');
      });
    });
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (window.naver && dragendListener) { // window.naver 확인 추가tener); // window.naver 사용
        naver.maps.Event.removeListener(dragendListener); // 'naver' 직접 사용
      }
    };
  }, [activeFilters, isMapReady, onFilterClick]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};

export default NaverMap;