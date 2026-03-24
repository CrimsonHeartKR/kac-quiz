/**
 * 기본 상식 퀴즈 30문제 생성 스크립트
 * 실행: node docs/seed-30-quiz.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://exeiahjopgoqtsrjliwk.supabase.co',
  'sb_publishable_HNVPF7Cs3zbmEgDTjTz-Pw_ZhbbxUbp'
)

const QUIZ_TITLE = '기본 상식 퀴즈 30문제'

const questions = [
  // ── OX 문제 (10문제) ──
  { type: 'ox', text: '지구는 태양계에서 세 번째 행성이다.', correct: 0, time: 15 },
  { type: 'ox', text: '물의 화학식은 H3O이다.', correct: 1, time: 15 },
  { type: 'ox', text: '대한민국의 수도는 서울이다.', correct: 0, time: 10 },
  { type: 'ox', text: '빛의 속도는 초속 약 30만 km이다.', correct: 0, time: 15 },
  { type: 'ox', text: '인간의 뼈는 총 300개이다.', correct: 1, time: 15 },
  { type: 'ox', text: '다이아몬드는 탄소로 이루어져 있다.', correct: 0, time: 15 },
  { type: 'ox', text: '달에는 중력이 전혀 없다.', correct: 1, time: 15 },
  { type: 'ox', text: '에베레스트 산은 세계에서 가장 높은 산이다.', correct: 0, time: 15 },
  { type: 'ox', text: '일본의 수도는 오사카이다.', correct: 1, time: 10 },
  { type: 'ox', text: 'DNA는 이중나선 구조이다.', correct: 0, time: 15 },

  // ── 4지선다 문제 (20문제) ──
  { type: 'text', text: '태양계에서 가장 큰 행성은?', options: ['화성', '목성', '토성', '해왕성'], correct: 1, time: 20 },
  { type: 'text', text: '1년은 며칠인가? (평년 기준)', options: ['364일', '365일', '366일', '360일'], correct: 1, time: 15 },
  { type: 'text', text: '세계에서 가장 넓은 대륙은?', options: ['아프리카', '유럽', '아시아', '북아메리카'], correct: 2, time: 20 },
  { type: 'text', text: '물이 끓는 온도는? (1기압 기준)', options: ['90°C', '95°C', '100°C', '110°C'], correct: 2, time: 15 },
  { type: 'text', text: '한글을 창제한 왕은?', options: ['태종', '세종대왕', '영조', '정조'], correct: 1, time: 15 },
  { type: 'text', text: '피타고라스 정리에서 직각삼각형의 빗변의 제곱은?', options: ['두 변의 합', '두 변의 제곱의 합', '두 변의 곱', '두 변의 차'], correct: 1, time: 20 },
  { type: 'text', text: '인체에서 가장 큰 장기는?', options: ['심장', '폐', '간', '피부'], correct: 3, time: 20 },
  { type: 'text', text: '세계에서 가장 긴 강은?', options: ['아마존강', '나일강', '양쯔강', '미시시피강'], correct: 1, time: 20 },
  { type: 'text', text: '원소기호 "O"는 무엇을 나타내는가?', options: ['금', '은', '산소', '수소'], correct: 2, time: 15 },
  { type: 'text', text: '지구의 자전 주기는 약?', options: ['12시간', '24시간', '36시간', '48시간'], correct: 1, time: 15 },
  { type: 'text', text: '대한민국 국기의 이름은?', options: ['일장기', '태극기', '성조기', '유니언잭'], correct: 1, time: 10 },
  { type: 'text', text: '1 킬로미터는 몇 미터인가?', options: ['100m', '500m', '1,000m', '10,000m'], correct: 2, time: 10 },
  { type: 'text', text: '세계에서 인구가 가장 많은 나라는?', options: ['미국', '인도', '중국', '인도네시아'], correct: 1, time: 20 },
  { type: 'text', text: '비타민 C가 풍부한 과일은?', options: ['바나나', '레몬', '포도', '수박'], correct: 1, time: 15 },
  { type: 'text', text: '올림픽은 몇 년마다 개최되는가?', options: ['2년', '3년', '4년', '5년'], correct: 2, time: 15 },
  { type: 'text', text: '소리가 전달되지 않는 곳은?', options: ['물속', '공기 중', '우주(진공)', '땅속'], correct: 2, time: 20 },
  { type: 'text', text: '컴퓨터에서 1바이트는 몇 비트인가?', options: ['4비트', '8비트', '16비트', '32비트'], correct: 1, time: 15 },
  { type: 'text', text: '무지개는 총 몇 가지 색으로 구성되는가?', options: ['5가지', '6가지', '7가지', '8가지'], correct: 2, time: 15 },
  { type: 'text', text: '세계에서 가장 작은 대륙은?', options: ['유럽', '남극', '오세아니아', '남아메리카'], correct: 2, time: 20 },
  { type: 'text', text: '산소를 만드는 식물의 과정은?', options: ['호흡', '광합성', '증산', '발효'], correct: 1, time: 20 },
]

async function main() {
  console.log('퀴즈 세트 생성 중...')

  // 1. Create quiz set
  const { data: quizSet, error: setErr } = await supabase
    .from('quiz_sets')
    .insert({ title: QUIZ_TITLE })
    .select('id')
    .single()

  if (setErr || !quizSet) {
    console.error('퀴즈 세트 생성 실패:', setErr)
    return
  }

  console.log(`퀴즈 세트 생성 완료: ${quizSet.id}`)

  // 2. Create questions
  const rows = questions.map((q, i) => ({
    quiz_set_id: quizSet.id,
    order_num: i,
    question_text: q.text,
    question_type: q.type,
    options: q.type === 'ox' ? ['O', 'X'] : q.options,
    option_images: q.type === 'ox' ? [null, null] : [null, null, null, null],
    correct_index: q.correct,
    time_limit: q.time,
    slide_image_url: null,
  }))

  const { error: qErr } = await supabase.from('questions').insert(rows)

  if (qErr) {
    console.error('문제 생성 실패:', qErr)
    return
  }

  console.log(`✅ ${questions.length}문제 생성 완료!`)
  console.log(`   - OX 문제: ${questions.filter(q => q.type === 'ox').length}개`)
  console.log(`   - 4지선다: ${questions.filter(q => q.type === 'text').length}개`)
}

main()
