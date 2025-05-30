/* global naver */
class RouteService {
  constructor(mapInstance) {
    this.mapInstance = mapInstance;
    this.cctvMarkers = [];
    this.pathInstance = null;
    this.pathBorderInstance = null;
    this.storeMarkers = [];
    this.currentInfoWindow = null;
    this.startMarker = null;
    this.endMarker = null;
    
    this.routeCache = new Map();
    this.currentRouteType = null;

    // ▼ 새로 추가되는 변수들 ▼
    this.activeAborter = null;   // 진행 중 fetch 취소용
    this.latestRequestId = 0;      // 응답 레이스 컨트롤용

    // 지도 클릭 시 열려있는 정보 창 닫기
    naver.maps.Event.addListener(this.mapInstance, 'click', () => {
      if (this.currentInfoWindow) {
        this.currentInfoWindow.close();
      }
    });
  }

  clearMap() {
    // 경로선 제거
    if (this.pathInstance) {
      this.pathInstance.setMap(null);
      this.pathInstance = null;
    }
    if (this.pathBorderInstance) {
      this.pathBorderInstance.setMap(null);
      this.pathBorderInstance = null;
    }
    
    // CCTV 마커 제거
    this.cctvMarkers.forEach(marker => marker.setMap(null));
    this.cctvMarkers = [];
    
    // 편의점 마커 제거
    this.storeMarkers.forEach(marker => marker.setMap(null));
    this.storeMarkers = [];

    // 시작 및 도착 마커 제거
    if (this.startMarker) {
        this.startMarker.setMap(null);
        this.startMarker = null;
    }
    if (this.endMarker) {
        this.endMarker.setMap(null);
        this.endMarker = null;
    }
    
    // 열려있는 정보창 닫기
    if (this.currentInfoWindow) {
      this.currentInfoWindow.close();
      this.currentInfoWindow = null;
    }
    // this.markers 배열은 더 이상 명시적으로 사용하지 않으므로 관련 코드 제거
  }

  // 캐시 키 생성
  generateCacheKey(startCoords, goalCoords, routeType) {
    return `${startCoords.latitude},${startCoords.longitude}-${goalCoords.latitude},${goalCoords.longitude}-${routeType}`;
  }

  // 출발 도착 마커 사이즈 줄임
  calculateMarkerSize(zoom) {
    // 확대 수준에 따라 마커 크기 조정 (기본 크기 증가)
    return Math.max(40, Math.round(40 * (zoom / 14)));
  }

  updateMarkers() {
    const size = this.calculateMarkerSize(this.mapInstance.getZoom());
  
    if (this.startMarker) {
      const startIcon = {
        url: 'images/map/start.svg',
        size: new naver.maps.Size(size, size),
        scaledSize: new naver.maps.Size(size, size),
        origin: new naver.maps.Point(0, 0),
        anchor: new naver.maps.Point(size/2, size/2)
      };
      this.startMarker.setIcon(startIcon);
    }

    if (this.endMarker) {
      const endIcon = {
        url: 'images/map/goal.svg',
        size: new naver.maps.Size(size, size),
        scaledSize: new naver.maps.Size(size, size),
        origin: new naver.maps.Point(0, 0),
        anchor: new naver.maps.Point(size/2, size/2)
       };
      this.endMarker.setIcon(endIcon);
    }
  }

  async drawRoute(startCoords, goalCoords, routeType) {
    /* 1) 진행 중 요청이 있으면 즉시 취소 */
    if (this.activeAborter) {
      this.activeAborter.abort();
    }
    this.activeAborter = new AbortController();

    /* 2) 레이스 컨트롤용 ID 발급 */
    const requestId = ++this.latestRequestId;

    const cacheKey = this.generateCacheKey(startCoords, goalCoords, routeType);

    /* 3) 캐시된 데이터가 있으면 바로 사용 */
    if (this.routeCache.has(cacheKey)) {
      console.log('캐시된 경로 데이터 사용:', routeType);
      this.clearMap(); // 이전 그래픽 요소 모두 제거
      this.currentRouteType = routeType;
      this.createAndAddStartEndMarkers(startCoords, goalCoords); // 시작/도착 마커 다시 생성

      const cachedData = this.routeCache.get(cacheKey);
      this.drawCachedRoute(cachedData, routeType); // 캐시된 경로 및 관련 마커 그리기
      
      // 캐시 사용 시에도 지도 범위 조정
      const bounds = new naver.maps.LatLngBounds();
      cachedData.path.forEach(latlng => bounds.extend(latlng));
      this.mapInstance.fitBounds(bounds);

      return cachedData.routeInfo;   // 끝!
    }

    /* 4) 캐시가 없으면 API 호출 */
    console.log('새로운 경로 데이터 요청:', routeType);
    this.clearMap(); // 이전 그래픽 요소 모두 제거
    this.currentRouteType = routeType;
    this.createAndAddStartEndMarkers(startCoords, goalCoords); // 시작/도착 마커 생성

    const apiEndpoint = routeType === 'safe' ? 'safe-direction' : 'normal-direction';
    const startStr = `${startCoords.latitude},${startCoords.longitude}`;
    const goalStr = `${goalCoords.latitude},${goalCoords.longitude}`;
    const PROXY_URL = 'https://moyak.store';
    const url = `${PROXY_URL}/direction/${apiEndpoint}?start=${startStr}&goal=${goalStr}`;

    let result;
    try {
      const res = await fetch(url, { signal: this.activeAborter.signal });
      if (!res.ok) {
        // 응답이 AbortError로 인해 오지 않은 경우 res.json() 호출 전에 에러 발생 가능성 있음
        // 따라서 !res.ok 체크 전에 AbortController의 signal 상태를 확인하는 것이 더 안전할 수 있으나,
        // fetch가 abort되면 .catch 블록으로 바로 이동하므로, 여기서는 res.json()을 시도해도 괜찮음.
        const errorData = await res.json();
        throw new Error(errorData.error || '경로 검색 실패');
      }
      result = await res.json();
    } catch (err) {
      /* fetch 가 abort 된 경우 quiet-fail */
      if (err.name === 'AbortError') {
        console.log('Fetch aborted:', requestId);
        return null;
      }
      console.error('경로 그리기 실패:', err);
      // clearMap()이 이미 호출되었으므로, 여기서 추가적인 UI 정리는 필요 없을 수 있음.
      // 다만, 사용자에게 오류를 알리는 로직은 필요할 수 있음 (예: throw err 또는 특정 UI 업데이트)
      throw err; // 또는 null 반환 등 상황에 맞게 처리
    }

    /* ▶▶▶ 응답이 “가장 최근 호출”인지 확인 */
    if (requestId !== this.latestRequestId) {
      console.log('뒤늦게 도착한 응답, 무시:', requestId, '최신 ID:', this.latestRequestId);
      return null; // 뒤늦게 도착한 응답이므로 버린다.
    }

    this.activeAborter = null; // 성공적으로 완료되었으므로 aborter 초기화

    /* 5) 응답이 정상일 때만 그리기 */
    if (result.success && result.data.features) {
      const pathCoordinates = [];
      result.data.features.forEach(feature => {
        if (feature.geometry.type === 'LineString') {
          pathCoordinates.push(...feature.geometry.coordinates);
        }
      });

      const path = pathCoordinates.map(coord => new naver.maps.LatLng(coord[1], coord[0]));
      this.drawRoutePath(path); // 경로선 그리기

      /* ▼ 지도 화면 맞추기 */
      const bounds = new naver.maps.LatLngBounds();
      path.forEach(latlng => bounds.extend(latlng));
      this.mapInstance.fitBounds(bounds);

      const routeInfo = {
        distance: result.data.features[0].properties.totalDistance || 0,
        time: result.data.features[0].properties.totalTime || 0,
        safety: result.data.safety,
        cctvCount: result.data.nearbyCCTVs?.length || 0,
        storeCount: result.data.nearbyStores?.length || 0
      };

      /* ▼ 캐시 적재 */
      this.routeCache.set(cacheKey, {
        path,
        routeInfo,
        nearbyCCTVs: result.data.nearbyCCTVs || [],
        nearbyStores: result.data.nearbyStores || []
      });

      /* ▼ 마커/정보 등 부가 요소 */
      if (routeType === 'safe') {
        if (result.data.nearbyCCTVs && result.data.nearbyCCTVs.length > 0) {
          this.displayCCTVMarkers(result.data.nearbyCCTVs);
          this.toggleCCTVMarkers(false); // 초기에는 숨김
        }
        if (result.data.nearbyStores && result.data.nearbyStores.length > 0) {
          this.displayStoreMarkers(result.data.nearbyStores);
          this.toggleStoreMarkers(false); // 초기에는 숨김
        }
      }
      return routeInfo;
    }

    return null; // 데이터 이상 시 또는 result.success가 false일 때
  }

  // 시작/도착 마커 생성 및 추가하는 헬퍼 메서드
  createAndAddStartEndMarkers(startCoords, goalCoords) {
    const initialSize = this.calculateMarkerSize(this.mapInstance.getZoom());
    const initialHalf = initialSize / 2;

    this.startMarker = new naver.maps.Marker({
      position: new naver.maps.LatLng(startCoords.latitude, startCoords.longitude),
      map: this.mapInstance,
      icon: {
        url: 'images/map/start.svg',
        size: new naver.maps.Size(initialSize, initialSize),
        scaledSize: new naver.maps.Size(initialSize, initialSize),
        origin: new naver.maps.Point(0, 0),
        anchor: new naver.maps.Point(initialHalf, initialHalf)
      },
      zIndex: 50
    });

    this.endMarker = new naver.maps.Marker({
      position: new naver.maps.LatLng(goalCoords.latitude, goalCoords.longitude),
      map: this.mapInstance,
      icon: {
        url: 'images/map/goal.svg',
        size: new naver.maps.Size(initialSize, initialSize),
        scaledSize: new naver.maps.Size(initialSize, initialSize),
        origin: new naver.maps.Point(0, 0),
        anchor: new naver.maps.Point(initialHalf, initialHalf)
      },
      zIndex: 50
    });
    
    // zoom_changed 리스너는 한 번만 추가하거나, MapService 등에서 중앙 관리하는 것이 좋습니다.
    // 현재 구조에서는 drawRoute가 호출될 때마다 리스너가 중복 추가될 수 있습니다.
    // 이 부분은 기존 코드의 동작을 최대한 유지하되, 개선이 필요할 수 있습니다.
    // 여기서는 명시적으로 리스너를 추가/제거하지 않고, updateMarkers가 호출될 것을 기대합니다.
    // 만약 `this.markers.push`를 사용했다면, `clearMap`에서 `this.markers`를 비우므로 문제가 없습니다.
    // 기존 코드에서는 this.markers.push(this.startMarker, this.endMarker)가 있었지만,
    // clearMap에서 startMarker, endMarker를 직접 null로 만들고 지도에서 제거하므로,
    // this.markers 배열을 통한 관리는 필수는 아닙니다.
  }
  
  // 캐시된 경로 그리기 (경로선 및 관련 마커)
  drawCachedRoute(cachedData, routeType) {
    this.drawRoutePath(cachedData.path); // 경로선 그리기

    if (routeType === 'safe') {
      if (cachedData.nearbyCCTVs && cachedData.nearbyCCTVs.length > 0) {
        this.displayCCTVMarkers(cachedData.nearbyCCTVs);
        this.toggleCCTVMarkers(false); // 초기에는 숨김
      }
      if (cachedData.nearbyStores && cachedData.nearbyStores.length > 0) {
        this.displayStoreMarkers(cachedData.nearbyStores);
        this.toggleStoreMarkers(false); // 초기에는 숨김
      }
    }
  }

  // 경로 path 그리기 (공통 로직 분리)
  drawRoutePath(path) {
    const routeColor = {
      border: '#FFFFFF',
      main: '#4B89DC'
    };

    // 테두리 경로
    this.pathBorderInstance = new naver.maps.Polyline({
      map: this.mapInstance,
      path: path,
      strokeColor: routeColor.border,
      strokeWeight: 12,
      strokeOpacity: 1,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      zIndex: 1
    });

    // 메인 경로
    this.pathInstance = new naver.maps.Polyline({
      map: this.mapInstance,
      path: path,
      strokeColor: routeColor.main,
      strokeWeight: 6,
      strokeOpacity: 1,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      zIndex: 2
    });
  }

  // cctv랑 편의점 토글
  toggleCCTVMarkers(show) {
    this.cctvMarkers.forEach(marker => {
      marker.setMap(show ? this.mapInstance : null);
    });
    
    // 표시하지 않을 때 열려있는 정보 창 닫기
    if (!show && this.currentInfoWindow) {
      this.currentInfoWindow.close();
    }
  }

  toggleStoreMarkers(show) {
    this.storeMarkers.forEach(marker => {
      marker.setMap(show ? this.mapInstance : null);
    });

    // 표시하지 않을 때 열려있는 정보 창 닫기
    if (!show && this.currentInfoWindow) {
      this.currentInfoWindow.close();
    }
  }

  displayCCTVMarkers(cctvData) {
    cctvData.forEach(cctv => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(cctv.latitude, cctv.longitude),
        map: this.mapInstance,
        icon: { 
          url: '/images/map/direction/cctv.png',
          size: new naver.maps.Size(24, 24), 
          scaledSize: new naver.maps.Size(24, 24), 
          origin: new naver.maps.Point(0, 0),
          anchor: new naver.maps.Point(12, 12)
        },
        zIndex: 30
      });

      const infoWindow = new naver.maps.InfoWindow({
        content: `
          <div style="padding: 10px; min-width: 160px; max-width: 180px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
             <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #333;">CCTV 정보</h4>
             <p style="margin: 3px 0; font-size: 13px; color: #666;">${cctv.address || '주소 정보 없음'}</p>
             <p style="margin: 3px 0; font-size: 13px; color: #666;">목적: ${cctv.purpose || '안전 감시'}</p>
             <p style="margin: 3px 0; font-size: 12px; color: #888;">설치 대수: ${cctv.cameraCount || 1}대</p>
          </div>
        `,
        borderWidth: 0,
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
      });

      let isInfoWindowOpen = false;
      
      naver.maps.Event.addListener(marker, 'click', () => {
        if (isInfoWindowOpen) {
          infoWindow.close();
          isInfoWindowOpen = false;
        } else {
          if (this.currentInfoWindow) {
            this.currentInfoWindow.close();
          }
          infoWindow.open(this.mapInstance, marker);
          this.currentInfoWindow = infoWindow;
          isInfoWindowOpen = true;
        }
      });

      this.cctvMarkers.push(marker);
    });
  }

  displayStoreMarkers(stores) {
    stores.forEach(store => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(store.latitude, store.longitude),
        map: this.mapInstance,
        icon: {
          url: '/images/map/direction/store.png',
          size: new naver.maps.Size(24, 24),
          scaledSize: new naver.maps.Size(24, 24),
          origin: new naver.maps.Point(0, 0),
          anchor: new naver.maps.Point(12, 12)
        },
        zIndex: 30
      });

      const infoWindow = new naver.maps.InfoWindow({
        content: `
          <div style="padding: 10px; min-width: 160px; max-width: 180px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
            <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #333;">${store.name || '편의점'}</h4>
            <p style="margin: 3px 0; font-size: 13px; color: #666;">${store.address || '주소 정보 없음'}</p>
            <p style="margin: 3px 0; font-size: 12px; color: #888;">거리: ${store.distance || '정보 없음'}</p>
          </div>
        `,
        borderWidth: 0,
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
      });

      let isInfoWindowOpen = false;

      naver.maps.Event.addListener(marker, 'click', () => {
        if (isInfoWindowOpen) {
          infoWindow.close();
          isInfoWindowOpen = false;
        } else {
          if (this.currentInfoWindow) {
            this.currentInfoWindow.close();
          }
          infoWindow.open(this.mapInstance, marker);
          this.currentInfoWindow = infoWindow;
          isInfoWindowOpen = true;
        }
      });

      this.storeMarkers.push(marker);
    });
  }
}

export default RouteService;