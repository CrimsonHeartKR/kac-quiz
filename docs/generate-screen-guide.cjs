const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "screenshots");
const OUT = path.join(__dirname, "KAC_Quiz_Screen_Guide.pptx");

// Color palette — Dark navy theme matching the app
const COLORS = {
  bg: "0D1B2A",
  bgLight: "1B2838",
  accent: "E8A020",
  white: "FFFFFF",
  gray: "94A3B8",
  textDark: "1E293B",
};

const slides = [
  { file: "01_participant_join.png", title: "참가자 입장 화면", desc: "참가자가 PIN 코드를 입력하여 퀴즈에 참가하는 메인 화면입니다.\nQR코드 스캔 또는 4자리 PIN 입력으로 참가할 수 있습니다." },
  { file: "02_login_select.png", title: "관리자 / 운영자 로그인 선택", desc: "관리자(퀴즈 생성·관리)와 운영자(퀴즈 실행·진행) 역할을 선택하는 화면입니다." },
  { file: "03_admin_quiz_list.png", title: "관리자 — 퀴즈 세트 목록", desc: "생성된 퀴즈 세트를 관리하는 관리자 대시보드입니다.\n퀴즈 편집, 복제, 삭제 및 새 퀴즈 세트 생성이 가능합니다." },
  { file: "04_admin_editor.png", title: "관리자 — 퀴즈 편집기", desc: "문항 유형(OX/4지선다/이미지), 질문 텍스트, 정답, 제한시간을 설정합니다.\n참가자 화면 배경/텍스트 색상 커스터마이징도 가능합니다." },
  { file: "05_host_select.png", title: "운영자 — 퀴즈 선택", desc: "진행할 퀴즈를 선택하면 새로운 세션이 자동 생성됩니다.\n생성된 세션에는 고유 PIN 코드가 부여됩니다." },
  { file: "06_host_lobby.png", title: "운영자 — 로비 (대기 화면)", desc: "QR코드와 PIN 코드가 표시되며, 참가자 입장을 실시간으로 확인합니다.\n모든 참가자가 입장하면 '퀴즈 시작' 버튼을 클릭합니다." },
  { file: "07_ox_quiz.png", title: "퀴즈 진행 — OX 문제", desc: "O/X 유형의 문제입니다. 타이머가 카운트다운되며,\n실시간 응답률과 참가자 수가 표시됩니다." },
  { file: "08_ox_reveal.png", title: "정답 공개 — OX 문제", desc: "정답이 체크마크로 표시되고, 각 선택지별 응답 수와 비율이\n바 차트로 나타납니다. 정답률도 함께 표시됩니다." },
  { file: "09_ranking.png", title: "순위 화면", desc: "각 문항 종료 후 참가자 순위가 표시됩니다.\n점수 변동과 순위 변화를 실시간으로 확인할 수 있습니다." },
  { file: "10_multiple_choice.png", title: "퀴즈 진행 — 4지선다 문제", desc: "A/B/C/D 4개 선택지가 컬러 코드로 구분됩니다.\n타이머와 실시간 응답률이 함께 표시됩니다." },
  { file: "11_image_quiz.png", title: "퀴즈 진행 — 이미지 문제", desc: "이미지 기반 선택 문제입니다. 2x2 그리드로 이미지 옵션이 배치되며,\n문제 이미지가 배경에 반투명 오버레이로 표시됩니다." },
  { file: "12_final_result.png", title: "최종 결과", desc: "모든 문항이 끝난 후 최종 순위가 표시됩니다.\n순위, 이름, 반, 점수가 테이블 형태로 정리됩니다." },
  { file: "13_mobile_participant.png", title: "참가자 모바일 화면", desc: "모바일 기기에서의 참가자 입장 화면입니다.\n반응형 디자인으로 모바일에서도 최적화된 UI를 제공합니다." },
];

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "KAC Quiz System";
pres.title = "KAC Quiz — 화면별 가이드";

// ── Title slide ──
const titleSlide = pres.addSlide();
titleSlide.background = { color: COLORS.bg };
titleSlide.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: "100%", h: 0.08, fill: { color: COLORS.accent }
});
titleSlide.addText("KAC Quiz System", {
  x: 0.8, y: 1.2, w: 8.4, h: 1.2,
  fontSize: 44, fontFace: "Arial Black", color: COLORS.accent,
  bold: true, margin: 0,
});
titleSlide.addText("화면별 스크린샷 가이드", {
  x: 0.8, y: 2.4, w: 8.4, h: 0.8,
  fontSize: 28, fontFace: "Arial", color: COLORS.white, margin: 0,
});
titleSlide.addText([
  { text: `총 ${slides.length}개 화면  |  OX · 4지선다 · 이미지 퀴즈 유형 포함`, options: { fontSize: 14, color: COLORS.gray } },
], {
  x: 0.8, y: 3.6, w: 8.4, h: 0.5, margin: 0,
});
titleSlide.addText("2026.03.24", {
  x: 0.8, y: 4.8, w: 8.4, h: 0.4,
  fontSize: 12, color: COLORS.gray, margin: 0,
});

// ── Content slides ──
slides.forEach((s, idx) => {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.bg };

  // Top accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: "100%", h: 0.06, fill: { color: COLORS.accent }
  });

  // Slide number badge
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 0.25, w: 0.5, h: 0.4,
    fill: { color: COLORS.accent }, rectRadius: 0.05,
  });
  slide.addText(`${idx + 1}`, {
    x: 0.5, y: 0.25, w: 0.5, h: 0.4,
    fontSize: 16, fontFace: "Arial", color: COLORS.bg,
    bold: true, align: "center", valign: "middle", margin: 0,
  });

  // Title
  slide.addText(s.title, {
    x: 1.15, y: 0.2, w: 7, h: 0.5,
    fontSize: 22, fontFace: "Arial", color: COLORS.white,
    bold: true, margin: 0,
  });

  // Description
  slide.addText(s.desc, {
    x: 1.15, y: 0.7, w: 7, h: 0.6,
    fontSize: 11, fontFace: "Arial", color: COLORS.gray,
    margin: 0,
  });

  // Screenshot image
  const imgPath = path.join(DIR, s.file);
  if (fs.existsSync(imgPath)) {
    // Special handling for mobile (portrait) screenshots
    if (s.file.includes("mobile") || s.file.includes("13_")) {
      // Center a narrower image for portrait
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 3.0, y: 1.5, w: 4, h: 3.9,
        fill: { color: COLORS.bgLight },
        line: { color: "334155", width: 1 },
        rectRadius: 0.1,
      });
      slide.addImage({
        path: imgPath,
        x: 3.15, y: 1.6, w: 3.7, h: 3.7,
        sizing: { type: "contain", w: 3.7, h: 3.7 },
      });
    } else {
      // Dark card background for screenshot
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 0.5, y: 1.5, w: 9, h: 3.9,
        fill: { color: COLORS.bgLight },
        line: { color: "334155", width: 1 },
        rectRadius: 0.1,
      });
      slide.addImage({
        path: imgPath,
        x: 0.65, y: 1.6, w: 8.7, h: 3.7,
        sizing: { type: "contain", w: 8.7, h: 3.7 },
      });
    }
  } else {
    // Placeholder if image not found
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y: 1.5, w: 9, h: 3.9,
      fill: { color: COLORS.bgLight },
      line: { color: "334155", width: 1, dashType: "dash" },
      rectRadius: 0.1,
    });
    slide.addText("스크린샷 이미지 없음", {
      x: 0.5, y: 2.8, w: 9, h: 1,
      fontSize: 16, color: COLORS.gray,
      align: "center", valign: "middle",
    });
  }

  // Footer
  slide.addText(`${idx + 1} / ${slides.length}`, {
    x: 8.5, y: 5.3, w: 1, h: 0.3,
    fontSize: 9, color: COLORS.gray, align: "right", margin: 0,
  });
});

// ── Save ──
pres.writeFile({ fileName: OUT }).then(() => {
  console.log(`PPT saved: ${OUT}`);
}).catch(err => {
  console.error("Error:", err);
});
