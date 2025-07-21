# MAPSPICY 🗺️🔥
**Safe Route Navigation & Community Platform for Women, Elderly, and Disabled**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.17.0-339933?logo=node.js)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.103.0-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![AWS EC2](https://img.shields.io/badge/AWS%20EC2-FF9900?logo=amazon-aws)](https://aws.amazon.com/ec2/)

> **2025 Capstone Design Final Project**  
> 기존 ‘최단 경로’ 네비게이션을 넘어, **안전 취약계층을 위한 ‘최안전 경로’**와  
> 시민 참여형 안전 데이터 생태계를 구축합니다.

---

## 📚 문서 바로가기

| 구분 | 문서 |
| ---- | ---- |
| API 명세 | [API.md](API.md) |
| 배포 가이드 | [DEPLOYMENT.md](DEPLOYMENT.md) |
| 프런트엔드 가이드 | [frontend.md](frontend.md) |
| 백엔드 가이드 | [backend.md](backend.md) |

---

## 📊 Problem Statement – Real Data Analysis

### 🚨 Critical Statistics (Police Data 2023)

| 지표 | 수치 |
| --- | --- |
| **대구 종합 체감안전도** | 2016 년 **7위** → 2023 년 **14위** *(6년 만의 최저)* |
| **전국 평균 체감안전도** | **83점** (‑0.4 ↓) vs. 대구 **77점** |
| **야간·저조도 구역 사고** | 가로등 미점등, 맨홀·보도블럭 파손 사고 지속 |

<p align="center">
  <img src="https://github.com/user-attachments/assets/3471af7b-0308-4ca0-8806-a636aab68833" width="450" alt="범죄 체감 안전도 그래프" />
</p>

> 출처: 경북매일·영남일보·계명대 신문 (2023–2024)

---

## 🎯 프로젝트 목적 

| 전략 | 세부 내용 |
| ---- | -------- |
| **① 사용자군 세분화 & 맞춤 정보** | • **일반 / 여성 / 노약자 / 장애인** 별 위험 가중치 적용<br> – 여성 : 비상벨·CCTV 밀집도<br> – 노약자 : 엘리베이터·경사로·휴게시설<br> – 장애인 : 무장애 화장실·휠체어 충전소 |
| **② 참여형 지역 안전 개선** | • 가로등·보도블럭·맨홀 등 **파손/위험 구간 제보**<br>• 사진 + GPS 업로드 → 지자체·경찰 연계 |

결국 **맞춤형 경로 안내 + 시민 참여형 안전 데이터** 두 축으로  
단순 길찾기를 넘어 ***지역 안전 생태계***를 지향합니다.

---

## 📌 개발 범위 및 필요성 

| 항목 | 설명 |
| ---- | ---- |
| **범위 집중** | 전국 → **대구·계명대 인근** MVP 출시로 비용·인력 최적화 |
| **데이터 연계** | 공공데이터포털·경찰청·지자체 + **사용자 제보** 융합 |
| **지속 가능성** | 로컬 MVP → **대구 전역 → 타 지역** 단계적 확장 |

---

## 🏆 기대 효과 

1. **학생·주민 야간 이동 불안 감소**  
2. **안전 취약계층(여성·노약자·장애인) 보호 강화**  
3. 파손 시설물 **간편한 제보 → 파손 수리 신청 & 지역 안전 강화**  
4. **공개 안전 데이터 시각화**로 지역 공동체 참여 촉진  
5. 소규모 팀이 수행 가능한 **현실적 프로젝트 모델** 제시  

---

## ✨ 핵심 기능

### 🧭 스마트 안전 경로
- **사용자 맞춤형**: 기본, 여성, 노약자
- **안전 가중치**: CCTV, 큰길, 편의점, 여성 비상 안전벨 등을 고려
- **안전 경로안내**: 안전 가중치를 계산하여 가장 점수가 높으면서 최단 거리 길 안내 제공
- **경로 안전 등급**: 안전 가중치로 점수를 환산하여 자신의 경로의 안전 등급을 확인 가능
- **실시간 현재 위치**: 따라가기 버튼을 누르면 실시간으로 자신의 위치 이동을 확인 가능

### 🗺️ 인터랙티브 안전 지도
- **카테고리**: 24 h 편의점, CCTV, 비상벨, 경찰서 등 실시간 마커
- **편의시설 및 비상시설**: 지도에 마커 클릭 후 근처 시설물 확인 및 길 안내

### 👥 커뮤니티 제보
- **시설 파손 신고**: 가로등·CCTV·비상벨 등 파손사항을 사진과 설명+ 지도에 클릭을 하여 위치 좌표와 같이 신고
- **위험 구간 제보**: 유저가 위험 구간이라고 느끼는 지도상 구간 지정하여 신고


### 📊 관리자 대시보드

- 시설물 파손 관련 건의 사항 확인
- 유저가 위험 구역으로 신고한 거리 확인
- 신고 사항을 지역, 나이, 연령 등에 따라 분류 및 통계 시각화
- 신고 사항 데이터 전처리

---

## 🛠️ 기술 스택

<p align="center">
  <img src="https://github.com/user-attachments/assets/e446da32-9dec-4df4-b59f-9b05b21c9561" width="900" alt="Tech Stack" />
</p>

---

## 🏗️ 시스템 아키텍처

<p align="center">
  <img src="https://github.com/user-attachments/assets/986f3a15-d9c0-43b7-84c3-d81c6ffb7ee5" width="850" alt="Architecture Diagram" />
</p>

---

## 🚀 주요 화면

<details>
<summary>메인 대시보드</summary>

- **실시간 안전 지도**  
- **빠른 경로 검색**  
- **지역별 안전 지수·주의사항**  
</details>

<details>
<summary>시설물 파손 신고</summary>

- 사진 촬영 → GPS 자동 태깅 → 설명 작성  
- 카테고리 구분 & 처리 상태 추적  
</details>

<details>
<summary>위험 경로 제보</summary>

- 지도에서 위험 구간 직접 표시  
- 위험 요소 태깅 & 시간대 기록  
</details>

<details>
<summary>관리자 페이지</summary>

- 미처리 신고 목록·우선순위  
- 지역별 통계 시각화  
- 긴급 공지 발송  
</details>

---

## ⚙️ 로컬 실행 방법

> 요구 사항: **Node.js 18+**, **npm / yarn**, **Git**

```bash
# 1) 저장소 클론
git clone https://github.com/<YOUR_TEAM>/mapspicy.git
cd mapspicy

# 2) 의존성 설치
npm install

# 3) 환경 변수 설정
cp .env.example .env       # API 키 & DB 정보 입력

# 4) 프런트엔드 dev 서버
npm run dev

# 5) 백엔드 (새 터미널)
cd backend
npm install
npm start
