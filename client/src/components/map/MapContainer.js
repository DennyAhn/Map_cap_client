// src/components/map/MapContainer.js
import React, { useState, useRef } from 'react';
import NaverMap from './NaverMap';
import MenuPanel from '../panels/MenuPanel';
import './MapContainer.css';

const filterButtons = {
  '일반': [
    { icon: '/images/map/category/store.png', text: '편의점' },
    { icon: '/images/map/category/oneonenine.png', text: '소방시설' },
    { icon: '/images/map/category/police.png', text: '경찰서' },
    { icon: '/images/map/category/warning.png', text: '외국인 주의구역' },
  ],
  '여성': [
    { icon: '/images/map/category/siren.png', text: '안전비상벨' },
    { icon: '/images/map/category/cctv.png', text: 'CCTV' },
    { icon: '/images/map/category/store.png', text: '편의점' },
    { icon: '/images/map/category/oneonenine.png', text: '소방시설' },
    { icon: '/images/map/category/police.png', text: '경찰서' },
    { icon: '/images/map/category/warning.png', text: '외국인 주의구역' },
  ],
  '노약자': [
    { icon: '/images/map/category/ele.png', text: '지하철역 엘리베이터' },
    { icon: '/images/map/category/drugstore.png', text: '약국' },
    { icon: '/images/map/category/charge.png', text: '휠체어 충전소' },
    { icon: '/images/map/category/noin.png', text: '복지시설' },
    { icon: '/images/map/category/store.png', text: '편의점' },
    { icon: '/images/map/category/oneonenine.png', text: '소방시설' },
    { icon: '/images/map/category/police.png', text: '경찰서' },
    { icon: '/images/map/category/warning.png', text: '외국인 주의구역' },
  ],
};

// API 호출을 위한 기본 URL
const API_BASE_URL = "https://moyak.store" // 개발 환경에서는 localhost 사용

const MapContainer = ({ 
  selectedMode, 
  isSearchOpen, 
  setIsSearchOpen, 
  onNavigate,
  onEditStart,
  onEditDestination,
  onCurrentLocationUpdate,
  startLocation
}) => {
  const [activeFilters, setActiveFilters] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationButtonActive, setIsLocationButtonActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [listPanelData, setListPanelData] = useState([]);
  const [showListPanel, setShowListPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mapServiceRef = useRef(null);

  const toggleMenu = () => setIsMenuOpen(prev => !prev);


  // API에서 데이터 가져오기 (중복 요청 방지 및 캐싱 기능이 포함된 최적화 버전)
  const fetchCategoryData = async (category) => {
    setIsLoading(true);
    setError(null);
    console.log(`${category} 데이터 요청 시작...`);
    
    try {
      // 현재 지도 중심 위치 가져오기 (사용자 GPS 위치 대신)
      let latitude = 35.8533;  // 기본 위치
      let longitude = 128.4897;  // 기본 위치
      
      if (mapServiceRef.current) {
        // getMapCenter 메서드 호출 - 현재 지도 중심 위치
        const mapCenter = mapServiceRef.current.getMapCenter();
        if (mapCenter) {
          latitude = mapCenter.latitude;
          longitude = mapCenter.longitude;
          console.log(`지도 중심 위치: 위도 ${latitude}, 경도 ${longitude}`);
        } else {
          // 지도 중심을 가져올 수 없는 경우 GPS 위치 사용 (폴백)
          const currentLocation = mapServiceRef.current.getCurrentLocation();
          if (currentLocation) {
            latitude = currentLocation.latitude;
            longitude = currentLocation.longitude;
            console.log(`GPS 위치 사용: 위도 ${latitude}, 경도 ${longitude}`);
          }
        }
      }
      
      // 지하철역 엘리베이터 또는 외국인 주의구역인 경우 placesApi에서 직접 데이터 가져오기
      if (category === '지하철역 엘리베이터' || category === '외국인 주의구역') {
        // placesApi의 getPlacesForFilter 함수를 가져오기
        const { getPlacesForFilter } = await import('../../services/placesApi');
        
        // 직접 하드코딩된 좌표 데이터 가져오기
        const placesData = await getPlacesForFilter(category, { lat: latitude, lng: longitude });
        
        // 좌표 데이터만 가지고 있으므로 기본 정보 추가
        const formattedData = placesData.map((item, index) => {
          // 각 장소까지의 거리 계산
          const distance = calculateDistance(
            latitude,
            longitude,
            item.latitude,
            item.longitude
          );
          
          return {
            id: `${category}-${index}`,
            name: `${category} ${index + 1}`,
            address: null, // null로 설정하여 주소 표시 안 함
            distance: distance,
            latitude: item.latitude,
            longitude: item.longitude
          };
        });
        
        console.log(`${category} 데이터 변환 완료:`, formattedData.length);
        return formattedData;
      }
      
      // 기타 카테고리는 API 호출로 처리
      // 카테고리에 따른 API 엔드포인트 매핑
      const categoryApiMap = {
        '편의점': '/api/ConvenienceStores',
        '소방시설': '/api/fireStationPlaces',
        '경찰서': '/api/policePlaces',
        '안전비상벨': '/api/womenPlaces',
        'CCTV': '/api/cctvPlaces',
        '약국': '/api/pharmacyPlaces',
        '휠체어 충전소': '/api/wheelChairPlaces',
        '복지시설': '/api/elderlyPlaces',
      };
      
      const apiEndpoint = categoryApiMap[category];
      if (!apiEndpoint) {
        throw new Error(`${category}에 대한 API 엔드포인트가 정의되지 않았습니다`);
      }
      
      const apiUrl = `${API_BASE_URL}${apiEndpoint}?lat=${latitude}&lng=${longitude}`;
      console.log(`API 요청 URL: ${apiUrl}`);
      
      // API 호출
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API 응답 에러: ${response.status} ${errorText}`);
        throw new Error(`데이터를 가져오는데 실패했습니다 (${response.status})`);
      }
      
      const data = await response.json();
      console.log(`${category} 데이터 응답:`, data);
      
      // 데이터의 첫 번째 항목의 모든 속성 출력 (디버깅)
      if (data && data.length > 0) {
        console.log(`첫 번째 항목 세부 정보:`, data[0]);
        console.log(`name 속성: "${data[0].name}"`);
        console.log(`address 속성: "${data[0].address}"`);
        console.log(`distance 속성: "${data[0].distance}"`);
        // 모든 키 출력
        console.log('사용 가능한 속성:', Object.keys(data[0]));
      }
      
      if (!data || data.length === 0) {
        console.log(`${category}에 대한 데이터가 없습니다.`);
        return [];
      }
      
      // 서버에서 이미 모든 정보가 포함된 형태로 반환되므로 그대로 사용
      // 하지만 필요한 속성이 없을 경우를 대비하여 기본값 설정
      const formattedData = data.map(item => ({
        ...item,
        id: item.id || `${category}-${Math.random().toString(36).substr(2, 9)}`,
        name: item.name || `${category}`, 
        address: item.address || '주소 정보 없음',
        distance: item.distance || '거리 정보 없음',
        coords: {
          latitude: item.latitude,
          longitude: item.longitude
        }
      }));
      
      console.log(`${category} 데이터 변환 완료:`, formattedData.length);
      return formattedData;
    } catch (err) {
      console.error(`API 호출 오류 (${category}):`, err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // 거리 계산 함수 추가
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // 지구의 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // 거리를 km 또는 m 단위로 반환
    if (distance >= 1) {
      return `${distance.toFixed(1)}km`;
    } else {
      return `${Math.round(distance * 1000)}m`;
    }
  };

  const handleFilterClick = async (filterText, options = {}) => {
    // options 객체에서 fromDragEvent 플래그 추출 (지도 드래그 이벤트에서 호출된 경우)
    const { fromDragEvent = false } = options;
    
    // 같은 카테고리를 다시 클릭하는 경우 및 드래그 이벤트가 아닌 경우에만 패널 토글
    if (selectedCategory === filterText && showListPanel && !fromDragEvent) {
      // 리스트 패널 닫기
      setShowListPanel(false);
      setSelectedCategory(null);
      
      // 필터에서도 제거하여 마커 삭제 트리거
      setActiveFilters(prev => prev.filter(f => f !== filterText));
    } else {
      // 먼저 필터 상태 업데이트하여 마커가 즉시 표시되도록 함
      if (!fromDragEvent) {
        setActiveFilters([filterText]);
      }
      
      // 로딩 상태 설정 (기존 데이터는 유지하면서 로딩 인디케이터 표시)
      setIsLoading(true);
      
      try {
        // 데이터 가져오기
        const data = await fetchCategoryData(filterText);
        
        // 이미 선택된 카테고리와 같고 패널이 열려있는 경우, 드래그 이벤트에서는 데이터만 업데이트
        if (selectedCategory === filterText && showListPanel) {
          // 데이터만 업데이트하고 패널 상태는 유지
        } else if (!fromDragEvent) {
          // 새 카테고리 선택 시 또는 패널이 닫혀있는 경우에만 패널 열기
          setSelectedCategory(filterText);
          setShowListPanel(true);
        }
        
        if (data && data.length > 0) {
          console.log(`리스트 패널 데이터 설정: ${data.length}개 항목`);
          setListPanelData(data);
        } else {
          // API 실패 시 기본 데이터 표시
          console.log(`${filterText}에 대한 데이터가 없습니다. 기본 메시지 표시`);
          const fallbackData = [
            { 
              name: `주변에 ${filterText} 정보가 없습니다`, 
              address: '다른 지역에서 다시 시도해보세요', 
              distance: '-' 
            }
          ];
          setListPanelData(fallbackData);
        }
      } catch (err) {
        console.error(`필터 데이터 가져오기 실패: ${err.message}`);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    
    // 현재 위치 버튼과 유사하게 지도 중심을 현재 위치로 유지
    if (mapServiceRef.current?.getMapInstance && !fromDragEvent) {
      const mapInstance = mapServiceRef.current.getMapInstance();
      if (mapInstance) {
        // 현재 중심 위치를 유지하되 약간의 줌 효과 적용하여 사용자에게 피드백 제공
        const currentZoom = mapInstance.getZoom();
        if (currentZoom < 15) {
          mapInstance.setZoom(15, true); // 줌이 낮으면 적정 레벨로 조정
        }
      }
    }
  };

  const handleMoveToCurrent = () => {
    setIsLocationButtonActive(true);
  
    if (mapServiceRef.current) {
      // 현재 위치로만 이동하고 마커나 패널은 유지
      const currentLocation = mapServiceRef.current.getCurrentLocation();
      
      if (currentLocation) {
        // 지도 중심만 현재 위치로 이동 (마커와 패널 상태는 변경하지 않음)
        mapServiceRef.current.panTo(currentLocation, 17);
      } else {
        // 현재 위치를 가져올 수 없는 경우에만 moveToCurrentLocation 호출
        mapServiceRef.current.moveToCurrentLocation();
      }
      
      // 필터나 패널 상태는 변경하지 않음 - 이 부분이 중요!
      // 기존 코드에서 handleFilterClick 호출 부분을 제거

      // 필요하다면 그냥 현재 위치로만 부드럽게 이동
      const mapInstance = mapServiceRef.current.getMapInstance();
      if (mapInstance) {
        const currentZoom = mapInstance.getZoom();
        if (currentZoom < 15) {
          mapInstance.setZoom(15, true);
        }
      }
    }
    
    setTimeout(() => setIsLocationButtonActive(false), 3000);
  };

  return (
    <div className="map-container" style={{ overflow: 'hidden' }}>
      {/* 상단 바 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        width: '100%',
        touchAction: 'pan-x',
        height: '170px',
        background: 'transparent',
        pointerEvents: 'auto'
      }}>
        <div className="search-bar" style={{
          width: '90%',
          maxWidth: 'calc(100% - 32px)',
          margin: '0 auto'
        }}>
          <button 
            className="menu-button"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              toggleMenu();
            }}
          >
            ≡
          </button>

          <div 
            onClick={() => onEditDestination()}
            style={{
              flex: 1,
              cursor: 'pointer',
              height: '70%',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <input 
              type="text" 
              placeholder="원하는 장소, 주소를 입력하세요" 
              className="search-input" 
              readOnly
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                height: '100%'
              }}
            />
          </div>
        </div>

        {/* 필터 버튼 */}
        <div className="filter-buttons-container">
          <div className="filter-buttons-scroll">
            {filterButtons[selectedMode].map((button, index) => (
              <button 
                key={index} 
                className={`filter-button ${activeFilters.includes(button.text) ? 'active' : ''}`}
                onClick={() => handleFilterClick(button.text)}
              >
                <img 
                  src={button.icon} 
                  alt={button.text}
                  className="filter-button-icon"
                  style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                />
                <span className="filter-button-text">{button.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 지도 컴포넌트 */}
      <div className="map-component-container">
        <NaverMap
          selectedMode={selectedMode}
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
          onFilterClick={handleFilterClick}
          onCurrentLocationUpdate={onCurrentLocationUpdate}
          startLocation={startLocation}
          mapServiceRef={mapServiceRef}
        />
      </div>

      {/* 현재 위치 버튼 */}
      <button
        className={`move-to-current-button ${isLocationButtonActive ? 'active' : ''} ${showListPanel ? 'panel-open' : ''}`}
        onClick={handleMoveToCurrent}
      >
        <img src="/images/RouteSelectionScreen/location.svg" alt="현재 위치로 이동" />
        
      </button>

      {/* 카테고리 리스트 패널 */}
      {showListPanel && (
        <div className="list-panel">
          <div className="list-panel-header">
            <h3>
              {selectedCategory} 
              <span className="list-count">({listPanelData.length})</span>
            </h3>
          </div>
          <div className="list-panel-content">
            {isLoading ? (
              <div className="loading-indicator">로딩 중...</div>
            ) : error ? (
              <div className="error-message">
                <p>데이터를 불러오는데 실패했습니다</p>
                <p className="error-details">{error}</p>
                <p className="error-help">서버가 실행 중인지 확인하세요</p>
              </div>
            ) : listPanelData.length === 0 ? (
              <div className="empty-result">
                <p>주변에 {selectedCategory} 정보가 없습니다</p>
                <p>다른 위치에서 다시 시도해보세요</p>
              </div>
            ) : (
              listPanelData.map((item, index) => {
                // 각 아이템 디버깅
                console.log(`리스트 아이템 ${index}:`, item);
                
                return (
                  <div key={index} className="list-item">
                    <div className="list-item-content">
                      <h4 className="list-item-title">
                        {item.name || `${selectedCategory} ${index + 1}`}
                      </h4>
                      <p className="list-item-distance">
                        {item.distance || '거리 정보 없음'}
                      </p>
                      {item.address && (
                        <p className="list-item-address">
                          {item.address}
                        </p>
                      )}
                      {item.phone && item.phone !== '' && (
                        <p className="list-item-phone">전화: {item.phone}</p>
                      )}
                      {item.category && item.category !== selectedCategory && (
                        <p className="list-item-category">분류: {item.category}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 메뉴 패널 */}
      <MenuPanel isOpen={isMenuOpen} onClose={toggleMenu} />
    </div>
  );
};

export default MapContainer;