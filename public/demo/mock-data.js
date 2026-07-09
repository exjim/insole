/**
 * StepCare 가상(데모) 데이터
 * 실제 사용자 정보가 아닌, 데모 시연을 위해 생성한 가상의 인물/수치입니다.
 */
const MOCK_SENIORS = [
  {
    id: "sc-001",
    name: "김옥순",
    age: 78,
    gender: "여",
    center: "행복요양센터 3층",
    riskLevel: "high",
    riskScore: 78,
    gaitAsymmetry: 14.2,
    avgCadence: 86,
    lastSync: "3분 전",
    weeklySteps: [1820, 1650, 1900, 1420, 980, 1100, 1240],
    weeklyRisk: [42, 46, 51, 58, 66, 72, 78],
    alerts: [
      { time: "07-09 14:22", type: "낙상 위험", severity: "high", message: "보행 중 좌우 압력 불균형 34% 감지, 즉시 확인 필요" },
      { time: "07-08 09:11", type: "보행 이상", severity: "medium", message: "케이던스 평소 대비 18% 저하" }
    ]
  },
  {
    id: "sc-002",
    name: "박만수",
    age: 82,
    gender: "남",
    center: "행복요양센터 3층",
    riskLevel: "medium",
    riskScore: 54,
    gaitAsymmetry: 9.1,
    avgCadence: 92,
    lastSync: "12분 전",
    weeklySteps: [2400, 2210, 2600, 2450, 2100, 2380, 2500],
    weeklyRisk: [38, 40, 37, 45, 49, 52, 54],
    alerts: [
      { time: "07-07 18:40", type: "보행 이상", severity: "medium", message: "야간 보행 중 정지 시간 증가" }
    ]
  },
  {
    id: "sc-003",
    name: "이정희",
    age: 74,
    gender: "여",
    center: "그린실버케어",
    riskLevel: "low",
    riskScore: 22,
    gaitAsymmetry: 3.4,
    avgCadence: 104,
    lastSync: "1분 전",
    weeklySteps: [4200, 4550, 4100, 4800, 4650, 4400, 4700],
    weeklyRisk: [20, 19, 22, 18, 21, 20, 22],
    alerts: []
  },
  {
    id: "sc-004",
    name: "최덕수",
    age: 85,
    gender: "남",
    center: "그린실버케어",
    riskLevel: "high",
    riskScore: 81,
    gaitAsymmetry: 17.6,
    avgCadence: 74,
    lastSync: "방금 전",
    weeklySteps: [980, 890, 1020, 760, 640, 700, 610],
    weeklyRisk: [55, 60, 63, 69, 74, 79, 81],
    alerts: [
      { time: "07-09 08:05", type: "낙상 감지", severity: "high", message: "충격 패턴 감지 - 보호자·센터 알림 발송됨" },
      { time: "07-06 16:12", type: "낙상 위험", severity: "high", message: "기립 후 3초간 압력 중심 불안정" }
    ]
  },
  {
    id: "sc-005",
    name: "한순자",
    age: 70,
    gender: "여",
    center: "행복요양센터 1층",
    riskLevel: "low",
    riskScore: 31,
    gaitAsymmetry: 5.8,
    avgCadence: 98,
    lastSync: "8분 전",
    weeklySteps: [3600, 3450, 3800, 3700, 3550, 3900, 3650],
    weeklyRisk: [28, 30, 27, 29, 31, 30, 31],
    alerts: []
  }
];

const RISK_LABEL = { high: "고위험", medium: "주의", low: "안전" };
