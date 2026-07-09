# StepCare (데모)

16채널(발당 8채널 × 2) 압력센서 스마트 인솔로 시니어의 보행을 분석하고,
낙상 위험을 조기에 감지해 보호자·요양기관에 알려주는 케어 플랫폼 **데모 웹앱**입니다.

- `public/index.html` — heycare.co.kr 스타일(히어로 → 문제정의 → 제품 → 라이브데모 → 솔루션구조 → 팀 → 문의)의 랜딩페이지
- `public/demo/index.html` — 실시간 8채널×2 압력 모니터링 + 가상 시니어 5명의 케어 리포트 대시보드
- 모든 인물·수치·팀 정보는 **가상 데모 데이터**입니다 (`public/demo/mock-data.js`).

## 로컬에서 열어보기

파일을 그대로 더블클릭해서 브라우저로 열어도 동작합니다. 로컬 서버로 띄우려면:

```bash
npx serve public -l 5000
# http://localhost:5000        → 랜딩페이지
# http://localhost:5000/demo/  → 라이브 데모 대시보드
```

## GitHub에 올리기

보안 정책상 제가 대신 로그인하거나 저장소를 만들 수 없어서, 아래 명령어를 직접 실행해 주세요.

```bash
cd stepcare-app
git init                     # 이미 초기화되어 있다면 생략
git add .
git commit -m "Initial commit: StepCare demo app"

# GitHub에서 새 저장소를 만든 뒤 (예: stepcare-app), 아래 origin URL을 본인 저장소로 교체
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/stepcare-app.git
git branch -M main
git push -u origin main
```

또는 GitHub CLI가 설치되어 있다면:

```bash
gh repo create stepcare-app --public --source=. --remote=origin --push
```

## Firebase Hosting으로 배포하기

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 새 프로젝트를 만듭니다.
2. `.firebaserc` 파일의 `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID`를 실제 프로젝트 ID로 바꿉니다.
3. 아래 명령어를 실행합니다.

```bash
npm install -g firebase-tools   # 최초 1회
firebase login                  # 브라우저에서 본인 계정으로 로그인
firebase deploy --only hosting
```

배포가 끝나면 `https://<프로젝트ID>.web.app` 주소로 접속할 수 있습니다.
GitHub 저장소와 Firebase 프로젝트를 GitHub Actions로 연결하면 `main` 브랜치에 푸시할 때마다 자동 배포되도록 설정할 수도 있습니다 (`firebase init hosting:github`).

## 8채널 센서 레이아웃

각 발에 다음 8개 압력 지점을 배치했습니다 (`public/demo/app.js`의 `SENSOR_LAYOUT`).

| 구역 | 센서 |
| --- | --- |
| 전족부 (4) | 무지(엄지), 중족골 내측·중앙·외측 |
| 중족부 (2) | 아치 내측·외측 |
| 후족부 (2) | 뒤꿈치 내측·외측 |

실제 인솔 하드웨어와 연동할 때는 `demo/index.html`의 `Socket` 모드로 전환한 뒤,
아래 형식의 JSON 프레임을 WebSocket으로 전송하면 됩니다.

```json
{
  "timestamp": 12345,
  "left":  { "raw": [8개 정수], "acc": { "x": 0, "y": 0.9, "z": 0.2 } },
  "right": { "raw": [8개 정수], "acc": { "x": 0, "y": 0.9, "z": 0.2 } }
}
```
