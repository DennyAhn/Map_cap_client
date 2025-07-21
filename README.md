# MAPSPICY 🗺️🔥  
> **여성과 노약자, 장애인을 위한 ‘안전 경로 안내 & 커뮤니티 플랫폼’**

## 📌 프로젝트 개요
- 2025 캡스톤 디자인 **기말 발표작**  
- 최근 ‘묻지마’ 범죄가 야간 노상에서 빈번하게 발생 ↗  → 사용자가 **안전한 이동 경로**와 **위험 지역 정보**를 한눈에 확인할 수 있도록 기획  
- **MAPSPICY**는  
  1. 안전 등급이 높은 길을 자동 추천  
  2. 편의·보안 시설(편의점, CCTV, 비상벨 등)을 시각화  
  3. 이용자 / 관리자 커뮤니티로 위험·파손 시설을 제보·수정  

## ✨ 핵심 기능
| 카테고리 | 기능 설명 |
| -------- | -------- |
| 경로 안내 | • 현재 위치 ↔ 목적지 **최단·최안전 경로 탐색**<br>• 실시간 안전 가중치 반영 |
| 지도 서비스 | • 전국 24h 편의점, CCTV, 비상벨 마커 표기<br>• 시설물 상태(정상/파손) 오버레이 |
| 커뮤니티 | • **시설물 파손 제보** 및 **위험 경로 제안** - 사진·좌표·설명 업로드<br>• 관리자 페이지에서 승인·반려 처리 |
| 데이터 처리 | • 외부 공공 API + 크롤링 데이터 → ETL → 안전 지수 산출 |
| 알림 & 통계 | • 위험 지역 진입 시 푸시 알림<br>• 지역별 위험도 Heat Map 및 통계 대시보드 |

## 🛠️ 기술 스택
| 구분 | 스택 |
| ---- | ---- |
| Front‑End | React + TypeScript, Vite, TailwindCSS |
| Back‑End | **Python FastAPI** (데이터 파이프라인) & **Spring Boot** (REST API) |
| 지도·경로 | Kakao / Google Maps SDK, Tmap Routes |
| 데이터베이스 | **MySQL**(RDS) – 서비스 데이터<br>**[Vector DB]** – 문서 임베딩 & RAG |
| DevOps | Docker, GitHub Actions CI/CD, AWS EC2 (배포) |

## 🏗️ 시스템 아키텍처

<img width="1496" height="1002" alt="image" src="https://github.com/user-attachments/assets/986f3a15-d9c0-43b7-84c3-d81c6ffb7ee5" />

```mermaid
flowchart LR
  subgraph Client
    M1[Web / PWA]
  end
  subgraph API
    G1[Spring Gateway]
    F1[FastAPI Safety AI]
  end
  subgraph Data
    DB[(MySQL)]
    VDB[(Vector DB)]
  end
  M1 --REST--> G1
  G1 --gRPC--> F1
  F1 --SQL--> DB
  F1 --embeddings--> VDB
