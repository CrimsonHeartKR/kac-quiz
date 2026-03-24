import { useState, useEffect, type ChangeEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentOperator } from '../lib/auth'
import { DEFAULT_THEME } from '../lib/theme'
import type { ThemeConfig } from '../lib/theme'
import defaultTheme from '../themes/default.json'
import aviationTheme from '../themes/aviation.json'
import safetyTheme from '../themes/safety.json'

const THEME_PRESETS: Record<string, ThemeConfig> = {
  default: defaultTheme as ThemeConfig,
  aviation: aviationTheme as ThemeConfig,
  safety: safetyTheme as ThemeConfig,
}

const PRESET_LABELS: Record<string, string> = {
  default: 'KAC 기본',
  aviation: '항공 테마',
  safety: '안전교육 테마',
}

type QuestionType = 'text' | 'ox' | 'image'

interface QuestionCard {
  id?: string
  questionType: QuestionType
  slideImageUrl: string | null
  slideImageFile: File | null
  questionText: string
  options: string[]
  optionImages: (string | null)[]
  optionImageFiles: (File | null)[]
  correctIndex: number
  timeLimit: number
}

function emptyQuestion(type: QuestionType = 'text'): QuestionCard {
  if (type === 'ox') {
    return {
      questionType: 'ox',
      slideImageUrl: null,
      slideImageFile: null,
      questionText: '',
      options: ['O', 'X'],
      optionImages: [null, null],
      optionImageFiles: [null, null],
      correctIndex: 0,
      timeLimit: 20,
    }
  }
  return {
    questionType: type,
    slideImageUrl: null,
    slideImageFile: null,
    questionText: '',
    options: ['', '', '', ''],
    optionImages: [null, null, null, null],
    optionImageFiles: [null, null, null, null],
    correctIndex: 0,
    timeLimit: 20,
  }
}

export default function AdminEditorPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')

  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<QuestionCard[]>([emptyQuestion()])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!editId)
  const [error, setError] = useState('')

  // 입장화면 커스텀 설정
  const [joinBgImage, setJoinBgImage] = useState<string | null>(null)
  const [joinBgFile, setJoinBgFile] = useState<File | null>(null)
  const [field1Label, setField1Label] = useState('이름')
  const [field1Placeholder, setField1Placeholder] = useState('이름을 입력하세요')
  const [showJoinSettings, setShowJoinSettings] = useState(false)

  // 참가자 화면 설정
  const [playerBgImage, setPlayerBgImage] = useState<string | null>(null)
  const [playerBgFile, setPlayerBgFile] = useState<File | null>(null)
  const [questionTextColor, setQuestionTextColor] = useState('#FFFFFF')
  const [showPlayerSettings, setShowPlayerSettings] = useState(false)
  const TEXT_COLOR_PRESETS = ['#FFFFFF', '#000000', '#FFFF00', '#00FF00', '#FF6B6B', '#60A5FA', '#F59E0B']

  // 테마 설정
  const [showThemeSettings, setShowThemeSettings] = useState(false)
  const [themeConfig, setThemeConfig] = useState<Partial<ThemeConfig>>({})
  const [activePreset, setActivePreset] = useState('default')
  const [themeBgFiles, setThemeBgFiles] = useState<Record<string, File | null>>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)

  function applyPreset(presetKey: string) {
    setActivePreset(presetKey)
    const preset = THEME_PRESETS[presetKey]
    if (preset) {
      setThemeConfig({ ...preset })
    }
  }

  function updateThemeField(key: keyof ThemeConfig, value: string) {
    setThemeConfig((prev) => ({ ...prev, [key]: value }))
  }

  // Auth check
  useEffect(() => {
    const op = getCurrentOperator()
    if (!op) navigate('/admin/login', { replace: true })
  }, [navigate])

  // Load existing quiz set
  useEffect(() => {
    if (!editId) return

    async function load() {
      setLoading(true)

      const { data: set } = await supabase
        .from('quiz_sets')
        .select('*')
        .eq('id', editId)
        .single()

      if (!set) {
        setError('퀴즈 세트를 찾을 수 없습니다.')
        setLoading(false)
        return
      }

      setTitle(set.title)
      if (set.join_bg_image) setJoinBgImage(set.join_bg_image)
      if (set.field1_label) setField1Label(set.field1_label)
      if (set.field1_placeholder) setField1Placeholder(set.field1_placeholder)
      if (set.player_bg_image) setPlayerBgImage(set.player_bg_image)
      if (set.question_text_color) setQuestionTextColor(set.question_text_color)
      if (set.theme_config && Object.keys(set.theme_config).length > 0) {
        setThemeConfig(set.theme_config)
        // Detect preset
        const presetMatch = Object.entries(THEME_PRESETS).find(
          ([, preset]) => preset.primaryColor === set.theme_config.primaryColor && preset.accentColor === set.theme_config.accentColor
        )
        if (presetMatch) setActivePreset(presetMatch[0])
      }

      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_set_id', editId)
        .order('order_num', { ascending: true })

      if (qs && qs.length > 0) {
        setQuestions(
          qs.map((q: Record<string, unknown>) => {
            const qType = (q.question_type as QuestionType) || 'text'
            const opts = (q.options as string[]) || (qType === 'ox' ? ['O', 'X'] : ['', '', '', ''])
            const optImgs = (q.option_images as (string | null)[]) || opts.map(() => null)
            return {
              id: q.id as string,
              questionType: qType,
              slideImageUrl: (q.slide_image_url as string) || null,
              slideImageFile: null,
              questionText: (q.question_text as string) || '',
              options: opts,
              optionImages: optImgs,
              optionImageFiles: opts.map(() => null),
              correctIndex: (q.correct_index as number) ?? 0,
              timeLimit: (q.time_limit as number) || 20,
            }
          }),
        )
      }

      setLoading(false)
    }

    load()
  }, [editId])

  function updateQuestion(index: number, partial: Partial<QuestionCard>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...partial } : q)),
    )
  }

  function updateOption(qIndex: number, optIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        const opts = [...q.options]
        opts[optIndex] = value
        return { ...q, options: opts }
      }),
    )
  }

  function handleImageChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    updateQuestion(index, { slideImageFile: file, slideImageUrl: previewUrl })
  }

  function removeImage(index: number) {
    updateQuestion(index, { slideImageFile: null, slideImageUrl: null })
  }

  function handleOptionImageChange(qIndex: number, optIndex: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        const imgs = [...q.optionImages]
        const files = [...q.optionImageFiles]
        imgs[optIndex] = previewUrl
        files[optIndex] = file
        return { ...q, optionImages: imgs, optionImageFiles: files }
      }),
    )
  }

  function removeOptionImage(qIndex: number, optIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        const imgs = [...q.optionImages]
        const files = [...q.optionImageFiles]
        imgs[optIndex] = null
        files[optIndex] = null
        return { ...q, optionImages: imgs, optionImageFiles: files }
      }),
    )
  }

  function changeQuestionType(index: number, newType: QuestionType) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q
        if (q.questionType === newType) return q
        const base = emptyQuestion(newType)
        return {
          ...base,
          id: q.id,
          slideImageUrl: q.slideImageUrl,
          slideImageFile: q.slideImageFile,
          questionText: q.questionText,
          timeLimit: q.timeLimit,
        }
      }),
    )
  }

  function addQuestion(type: QuestionType = 'text') {
    setQuestions((prev) => [...prev, emptyQuestion(type)])
  }

  function deleteQuestion(index: number) {
    if (questions.length <= 1) return
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  function moveQuestion(index: number, direction: 'up' | 'down') {
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= questions.length) return
    setQuestions((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'png'
    const path = `${crypto.randomUUID()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('quiz-images')
      .upload(path, file)

    if (uploadErr) throw uploadErr

    const { data } = supabase.storage.from('quiz-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('퀴즈 제목을 입력하세요.')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Upload slide images
      const imageUrls: (string | null)[] = []
      for (const q of questions) {
        if (q.slideImageFile) {
          const url = await uploadImage(q.slideImageFile)
          imageUrls.push(url)
        } else {
          imageUrls.push(q.slideImageUrl)
        }
      }

      // Upload option images
      const optionImageUrls: (string | null)[][] = []
      for (const q of questions) {
        const urls: (string | null)[] = []
        for (let oi = 0; oi < q.optionImages.length; oi++) {
          if (q.optionImageFiles[oi]) {
            const url = await uploadImage(q.optionImageFiles[oi]!)
            urls.push(url)
          } else {
            urls.push(q.optionImages[oi])
          }
        }
        optionImageUrls.push(urls)
      }

      // Upload join background image
      let joinBgUrl = joinBgImage
      if (joinBgFile) {
        joinBgUrl = await uploadImage(joinBgFile)
      }

      // Upload player background image
      let playerBgUrl = playerBgImage
      if (playerBgFile) {
        playerBgUrl = await uploadImage(playerBgFile)
      }

      const joinScreenFields = {
        join_bg_image: joinBgUrl,
        field1_label: field1Label.trim() || '이름',
        field1_placeholder: field1Placeholder.trim() || '이름을 입력하세요',
        player_bg_image: playerBgUrl,
        question_text_color: questionTextColor,
      }

      // Upload theme background images
      const bgKeys = ['bgImageWait', 'bgImagePlay', 'bgImageResult', 'bgImageProjector'] as const
      for (const key of bgKeys) {
        if (themeBgFiles[key]) {
          const url = await uploadImage(themeBgFiles[key]!)
          themeConfig[key] = url
        }
      }
      // Upload logo
      if (logoFile) {
        const url = await uploadImage(logoFile)
        themeConfig.logoUrl = url
      }

      // Build theme_config to save
      const themeToSave = Object.keys(themeConfig).length > 0 ? themeConfig : null

      let quizSetId = editId

      if (editId) {
        const { error: updateErr } = await supabase
          .from('quiz_sets')
          .update({ title: title.trim(), ...joinScreenFields, theme_config: themeToSave })
          .eq('id', editId)

        if (updateErr) throw updateErr
        await supabase.from('questions').delete().eq('quiz_set_id', editId)
      } else {
        const { data: newSet, error: insertErr } = await supabase
          .from('quiz_sets')
          .insert({ title: title.trim(), ...joinScreenFields, theme_config: themeToSave })
          .select('id')
          .single()

        if (insertErr || !newSet) throw insertErr || new Error('생성 실패')
        quizSetId = newSet.id
      }

      const rows = questions.map((q, i) => ({
        quiz_set_id: quizSetId,
        order_num: i,
        slide_image_url: imageUrls[i],
        question_text: q.questionText,
        question_type: q.questionType,
        options: q.options,
        option_images: optionImageUrls[i],
        correct_index: q.correctIndex,
        time_limit: q.timeLimit,
      }))

      const { error: qErr } = await supabase.from('questions').insert(rows)
      if (qErr) throw qErr

      navigate('/admin')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    )
  }

  const typeLabels: Record<QuestionType, string> = { text: '4지선다', ox: 'OX퀴즈', image: '이미지 보기' }
  const typeColors: Record<QuestionType, { bg: string; text: string; border: string }> = {
    text: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    ox: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    image: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
        <button onClick={() => navigate('/admin')} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          목록으로
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{questions.length}문항</span>
          <button onClick={handleSave} disabled={saving}
            className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-8 py-10">
        {error && (
          <div className="mb-8 px-4 py-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        {/* Quiz title */}
        <div className="mb-10">
          <label className="block text-sm font-medium text-gray-700 mb-2.5">퀴즈 제목</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="퀴즈 제목을 입력하세요"
            className="w-full rounded-lg px-5 py-3 text-lg text-gray-900 placeholder-gray-400 outline-none border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition-colors" />
        </div>

        {/* 입장화면 설정 */}
        <div className="mb-10">
          <button
            type="button"
            onClick={() => setShowJoinSettings(!showJoinSettings)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showJoinSettings ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            참가자 입장화면 설정
            <span className="text-xs font-normal text-gray-400">(배경 이미지, 입력 필드 커스텀)</span>
          </button>

          {showJoinSettings && (
            <div className="mt-4 bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              {/* 배경 이미지 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">배경 이미지 (PNG)</label>
                <p className="text-xs text-gray-400 mb-3">참가자가 PIN 입력 후 보게 되는 입장화면의 배경 이미지입니다. 권장 크기: 1080×1920 (모바일 세로)</p>
                {joinBgImage ? (
                  <div className="relative inline-block">
                    <img src={joinBgImage} alt="배경 미리보기"
                      className="h-48 rounded-lg object-contain border border-gray-200" />
                    <button onClick={() => { setJoinBgImage(null); setJoinBgFile(null) }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs text-white bg-red-500 hover:bg-red-600">
                      &#10005;
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full h-32 rounded-lg cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="text-center">
                      <svg className="w-8 h-8 text-gray-300 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                      <span className="text-sm text-gray-400">클릭하여 배경 이미지 업로드</span>
                      <span className="text-[11px] text-gray-300 mt-1">PNG, JPG, WebP / 최대 5MB / 권장 1080x1920px</span>
                    </div>
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setJoinBgFile(file)
                        setJoinBgImage(URL.createObjectURL(file))
                      }} />
                  </label>
                )}
              </div>

              {/* 입력 필드 설정 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">입력란 라벨</label>
                <p className="text-xs text-gray-400 mb-2">참가자에게 보이는 입력란의 제목입니다 (예: 이름, 닉네임, 팀명 등)</p>
                <input type="text" value={field1Label} onChange={(e) => setField1Label(e.target.value)}
                  placeholder="이름"
                  className="w-full rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">입력란 안내 텍스트</label>
                <p className="text-xs text-gray-400 mb-2">입력란 내부에 안내용으로 표시되는 텍스트입니다</p>
                <input type="text" value={field1Placeholder} onChange={(e) => setField1Placeholder(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="w-full rounded-lg px-4 py-2.5 text-sm text-gray-500 placeholder-gray-300 outline-none border border-gray-200 bg-gray-50 transition-colors" />
              </div>

              {/* 미리보기 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">미리보기</label>
                <div className="relative w-64 h-[420px] rounded-2xl overflow-hidden border border-gray-200 mx-auto"
                  style={{
                    background: joinBgImage
                      ? `url(${joinBgImage}) center/cover no-repeat`
                      : 'linear-gradient(135deg, #f0f4f8, #e2e8f0)',
                  }}>
                  <div className="absolute inset-0 flex items-end pb-16 px-5">
                    <div className="w-full bg-white rounded-xl p-4 shadow-lg space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-gray-800 mb-1">{field1Label}</div>
                        <div className="w-full rounded-lg px-3 py-2.5 text-xs bg-gray-50 text-gray-400 border border-gray-200">{field1Placeholder}</div>
                      </div>
                      <div className="w-full rounded-lg py-2.5 text-xs font-bold text-center text-white bg-blue-600">참가하기</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 참가자 퀴즈 화면 설정 */}
        <div className="mb-10">
          <button
            type="button"
            onClick={() => setShowPlayerSettings(!showPlayerSettings)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showPlayerSettings ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            참가자 퀴즈 화면 설정
            <span className="text-xs font-normal text-gray-400">(배경 이미지, 문항 텍스트 색상)</span>
          </button>

          {showPlayerSettings && (
            <div className="mt-4 bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              {/* 참가자 배경 이미지 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">참가자 배경 이미지</label>
                <p className="text-xs text-gray-400 mb-3">퀴즈 진행 중 참가자 모바일 화면의 배경 이미지입니다. 권장 크기: 1080x1920 (모바일 세로)</p>
                {playerBgImage ? (
                  <div className="relative inline-block">
                    <img src={playerBgImage} alt="참가자 배경 미리보기"
                      className="h-48 rounded-lg object-contain border border-gray-200" />
                    <button onClick={() => { setPlayerBgImage(null); setPlayerBgFile(null) }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs text-white bg-red-500 hover:bg-red-600">
                      &#10005;
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full h-32 rounded-lg cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="text-center">
                      <svg className="w-8 h-8 text-gray-300 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                      <span className="text-sm text-gray-400">클릭하여 배경 이미지 업로드</span>
                    </div>
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setPlayerBgFile(file)
                        setPlayerBgImage(URL.createObjectURL(file))
                      }} />
                  </label>
                )}
              </div>

              {/* 문항 텍스트 색상 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">문항 텍스트 색상</label>
                <p className="text-xs text-gray-400 mb-3">배경에 따라 문항 텍스트가 잘 보이도록 색상을 선택하세요</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {TEXT_COLOR_PRESETS.map((color) => (
                    <button key={color} type="button" onClick={() => setQuestionTextColor(color)}
                      className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: questionTextColor === color ? '#3B82F6' : '#D1D5DB',
                        boxShadow: questionTextColor === color ? '0 0 0 2px #3B82F680' : 'none',
                      }}
                      title={color}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                    <input type="color" value={questionTextColor} onChange={(e) => setQuestionTextColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300" />
                    <span className="text-xs text-gray-500 font-mono">{questionTextColor}</span>
                  </div>
                </div>
              </div>

              {/* 미리보기 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">미리보기</label>
                <div className="relative w-64 h-[360px] rounded-2xl overflow-hidden border border-gray-200 mx-auto"
                  style={{
                    background: playerBgImage
                      ? `url(${playerBgImage}) center/cover no-repeat`
                      : 'linear-gradient(135deg, #1e293b, #0f172a)',
                  }}>
                  <div className="absolute inset-0 flex flex-col p-4">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">1</div>
                      <div className="w-9 h-9 rounded-full border-2 border-green-400 flex items-center justify-center text-white text-xs font-bold">15</div>
                      <div className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">120</div>
                    </div>
                    {/* 문제 텍스트 */}
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-center text-sm font-bold" style={{ color: questionTextColor }}>
                        대한민국의 수도는?
                      </p>
                    </div>
                    {/* 버튼 */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {['A', 'B', 'C', 'D'].map((l, i) => (
                        <div key={i} className="h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: ['#E53E3E', '#3182CE', '#D69E2E', '#38A169'][i] }}>{l}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 테마 설정 */}
        <div className="mb-10">
          <button
            type="button"
            onClick={() => setShowThemeSettings(!showThemeSettings)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showThemeSettings ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            테마 설정
            <span className="text-xs font-normal text-gray-400">(색상, 배경 이미지, 애니메이션)</span>
          </button>

          {showThemeSettings && (
            <div className="mt-4 bg-white rounded-xl border border-gray-200 p-6 space-y-8">

              {/* 프리셋 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">테마 프리셋</label>
                <div className="flex gap-3">
                  {Object.entries(PRESET_LABELS).map(([key, label]) => {
                    const preset = THEME_PRESETS[key]
                    return (
                      <button key={key} onClick={() => applyPreset(key)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                          activePreset === key ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}>
                        <div className="flex gap-1">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primaryColor }} />
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.accentColor }} />
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.bgColor }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 색상 커스터마이징 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">색상 커스터마이징</label>
                <div className="grid grid-cols-3 gap-4">
                  {([
                    ['primaryColor', '메인 색상'],
                    ['accentColor', '강조 색상'],
                    ['bgColor', '배경 색상'],
                    ['btnA', '버튼 A (빨강)'],
                    ['btnB', '버튼 B (파랑)'],
                    ['btnC', '버튼 C (주황)'],
                    ['btnD', '버튼 D (초록)'],
                    ['correct', '정답 색상'],
                    ['incorrect', '오답 색상'],
                  ] as [keyof ThemeConfig, string][]).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <input type="color"
                        value={(themeConfig[key] as string) || (DEFAULT_THEME[key] as string)}
                        onChange={(e) => updateThemeField(key, e.target.value)}
                        className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{label}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{(themeConfig[key] as string) || (DEFAULT_THEME[key] as string)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 화면별 배경 이미지 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">화면별 배경 이미지</label>
                <p className="text-xs text-gray-400 mb-4">각 화면에 배경 이미지를 업로드하세요. 권장: 1920x1080 (16:9)</p>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    ['bgImageWait', '대기 화면'],
                    ['bgImagePlay', '퀴즈 화면'],
                    ['bgImageResult', '결과/순위 화면'],
                    ['bgImageProjector', '프로젝터 화면'],
                  ] as [keyof ThemeConfig, string][]).map(([key, label]) => {
                    const currentUrl = (themeConfig[key] as string) || ''
                    const hasFile = !!themeBgFiles[key]
                    const previewUrl = hasFile ? URL.createObjectURL(themeBgFiles[key]!) : currentUrl
                    return (
                      <div key={key} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                        <span className="text-xs font-medium text-gray-600 mb-2 block">{label}</span>
                        {previewUrl ? (
                          <div className="relative">
                            <img src={previewUrl} alt={label} className="w-full h-24 rounded-lg object-cover border border-gray-200" />
                            <button onClick={() => {
                              setThemeBgFiles((prev) => ({ ...prev, [key]: null }))
                              updateThemeField(key, '')
                            }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white bg-red-500 hover:bg-red-600">
                              &#10005;
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center w-full h-24 rounded-lg cursor-pointer bg-white border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
                            <div className="text-center">
                              <svg className="w-6 h-6 text-gray-300 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                              </svg>
                              <span className="text-[11px] text-gray-400">클릭하여 업로드</span>
                              <span className="text-[10px] text-gray-300 mt-0.5">PNG, JPG, WebP / 최대 5MB</span>
                            </div>
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                setThemeBgFiles((prev) => ({ ...prev, [key]: file }))
                              }} />
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Lottie 애니메이션 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">커스텀 애니메이션 (Lottie)</label>
                <p className="text-xs text-gray-400 mb-4">Lottie JSON 파일 URL을 입력하면 기본 SVG 애니메이션 대신 사용됩니다.</p>
                <div className="space-y-3">
                  {([
                    ['lottieTimer', '타이머 애니메이션'],
                    ['lottieCorrect', '정답 효과'],
                    ['lottieIncorrect', '오답 효과'],
                    ['lottieCelebration', '축하 효과'],
                  ] as [keyof ThemeConfig, string][]).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-500 w-24 shrink-0">{label}</span>
                      <input type="text"
                        value={(themeConfig[key] as string) || ''}
                        onChange={(e) => updateThemeField(key, e.target.value)}
                        placeholder="https://... Lottie JSON URL"
                        className="flex-1 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 outline-none border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition-colors" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 기타 설정 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">이벤트 이름</label>
                  <input type="text"
                    value={(themeConfig.eventName as string) || ''}
                    onChange={(e) => updateThemeField('eventName', e.target.value)}
                    placeholder="KAC 교육사업"
                    className="w-full rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none border border-gray-200 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">로고 이미지</label>
                  {(logoFile || (themeConfig.logoUrl as string)) ? (
                    <div className="flex items-center gap-2">
                      <img src={logoFile ? URL.createObjectURL(logoFile) : (themeConfig.logoUrl as string)} alt="로고" className="w-10 h-10 rounded-lg object-contain border border-gray-200" />
                      <button onClick={() => { setLogoFile(null); updateThemeField('logoUrl', '') }}
                        className="text-xs text-red-500 hover:text-red-600">삭제</button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-full py-2 rounded-lg cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
                      <span className="text-xs text-gray-400">로고 업로드</span>
                      <span className="text-[10px] text-gray-300">PNG, SVG / 정사각형 권장</span>
                      <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) setLogoFile(file)
                        }} />
                    </label>
                  )}
                </div>
              </div>

              {/* 테마 미리보기 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">색상 미리보기</label>
                <div className="flex gap-3 p-4 rounded-xl" style={{ backgroundColor: (themeConfig.bgColor as string) || DEFAULT_THEME.bgColor }}>
                  <div className="flex-1 space-y-2">
                    <div className="h-8 rounded-lg" style={{ backgroundColor: (themeConfig.primaryColor as string) || DEFAULT_THEME.primaryColor }} />
                    <div className="h-8 rounded-lg" style={{ backgroundColor: (themeConfig.accentColor as string) || DEFAULT_THEME.accentColor }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-32">
                    <div className="h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: (themeConfig.btnA as string) || DEFAULT_THEME.btnA }}>A</div>
                    <div className="h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: (themeConfig.btnB as string) || DEFAULT_THEME.btnB }}>B</div>
                    <div className="h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: (themeConfig.btnC as string) || DEFAULT_THEME.btnC }}>C</div>
                    <div className="h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: (themeConfig.btnD as string) || DEFAULT_THEME.btnD }}>D</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Question cards */}
        <div className="flex flex-col gap-8">
          {questions.map((q, qIdx) => (
            <div key={qIdx} className="bg-white rounded-xl border border-gray-200 p-7">
              {/* Card header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">문항 {qIdx + 1}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[q.questionType].bg} ${typeColors[q.questionType].text}`}>
                    {typeLabels[q.questionType]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => moveQuestion(qIdx, 'up')} disabled={qIdx === 0}
                    className="rounded-md w-8 h-8 flex items-center justify-center text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                    title="위로">&#9650;</button>
                  <button onClick={() => moveQuestion(qIdx, 'down')} disabled={qIdx === questions.length - 1}
                    className="rounded-md w-8 h-8 flex items-center justify-center text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                    title="아래로">&#9660;</button>
                  <button onClick={() => deleteQuestion(qIdx)} disabled={questions.length <= 1}
                    className="rounded-md w-8 h-8 flex items-center justify-center text-xs text-red-500 border border-red-200 hover:bg-red-50 disabled:opacity-30 transition-colors"
                    title="삭제">&#10005;</button>
                </div>
              </div>

              {/* Question type selector */}
              <div className="flex items-center gap-2.5 mb-5">
                <span className="text-xs font-medium text-gray-500">유형:</span>
                {(['text', 'ox', 'image'] as QuestionType[]).map((t) => (
                  <button key={t} onClick={() => changeQuestionType(qIdx, t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      q.questionType === t
                        ? `${typeColors[t].bg} ${typeColors[t].text} ${typeColors[t].border}`
                        : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                    }`}>
                    {typeLabels[t]}
                  </button>
                ))}
              </div>

              {/* Slide image upload */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  문제 이미지 (선택)
                </label>
                {q.slideImageUrl ? (
                  <div className="relative inline-block">
                    <img src={q.slideImageUrl} alt="slide preview"
                      className="max-h-40 rounded-lg object-contain border border-gray-200" />
                    <button onClick={() => removeImage(qIdx)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs text-white bg-red-500 hover:bg-red-600">
                      &#10005;
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full h-28 rounded-lg cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="text-center">
                      <span className="text-sm text-gray-400">클릭하여 이미지 업로드</span>
                      <p className="text-[10px] text-gray-300 mt-1">PNG, JPG, WebP / 최대 5MB / 권장 16:9 비율</p>
                    </div>
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleImageChange(qIdx, e)} />
                  </label>
                )}
              </div>

              {/* Question text */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-2">질문 텍스트</label>
                <input type="text" value={q.questionText}
                  onChange={(e) => updateQuestion(qIdx, { questionText: e.target.value })}
                  placeholder="질문을 입력하세요"
                  className="w-full rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition-colors" />
              </div>

              {/* OX type options */}
              {q.questionType === 'ox' && (
                <div className="mb-5">
                  <label className="block text-xs font-medium text-gray-500 mb-3">정답 선택</label>
                  <div className="flex gap-5">
                    {['O', 'X'].map((label, oIdx) => (
                      <button key={oIdx} onClick={() => updateQuestion(qIdx, { correctIndex: oIdx })}
                        className={`flex-1 flex items-center justify-center py-6 rounded-xl text-4xl font-extrabold border-2 transition-all ${
                          q.correctIndex === oIdx
                            ? (oIdx === 0 ? 'bg-blue-50 border-blue-400 text-blue-500' : 'bg-red-50 border-red-400 text-red-500')
                            : 'bg-gray-50 border-gray-200 text-gray-300 hover:bg-gray-100'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Text type options */}
              {q.questionType === 'text' && (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    {['A', 'B', 'C', 'D'].map((label, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <span className="text-xs font-bold w-5 text-center flex-shrink-0 text-gray-400">{label}</span>
                        <input type="text" value={q.options[oIdx] || ''}
                          onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                          placeholder={`보기 ${label}`}
                          className="flex-1 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition-colors" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium mr-2 text-gray-500">정답:</span>
                      {['A', 'B', 'C', 'D'].map((label, oIdx) => (
                        <label key={oIdx}
                          className={`flex items-center gap-1 cursor-pointer rounded-md px-2 py-1 text-xs font-medium border transition-colors ${
                            q.correctIndex === oIdx
                              ? 'text-blue-600 bg-blue-50 border-blue-200'
                              : 'text-gray-400 bg-white border-transparent hover:bg-gray-50'
                          }`}>
                          <input type="radio" name={`correct-${qIdx}`} checked={q.correctIndex === oIdx}
                            onChange={() => updateQuestion(qIdx, { correctIndex: oIdx })} className="hidden" />
                          {label}
                        </label>
                      ))}
                    </div>
                    <TimeLimitSelect q={q} qIdx={qIdx} updateQuestion={updateQuestion} />
                  </div>
                </>
              )}

              {/* Image type options */}
              {q.questionType === 'image' && (
                <>
                  <div className="grid grid-cols-2 gap-5 mb-5">
                    {['A', 'B', 'C', 'D'].map((label, oIdx) => (
                      <div key={oIdx} className={`rounded-xl p-3 border-2 transition-all ${
                        q.correctIndex === oIdx
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-500">보기 {label}</span>
                          <button onClick={() => updateQuestion(qIdx, { correctIndex: oIdx })}
                            className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                              q.correctIndex === oIdx
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                            }`}>
                            {q.correctIndex === oIdx ? '정답' : '정답 선택'}
                          </button>
                        </div>
                        {q.optionImages[oIdx] ? (
                          <div className="relative mb-2">
                            <img src={q.optionImages[oIdx]!} alt={`option ${label}`}
                              className="w-full aspect-square rounded-xl object-cover border border-gray-200" />
                            <button onClick={() => removeOptionImage(qIdx, oIdx)}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white bg-red-500 hover:bg-red-600">
                              &#10005;
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center w-full aspect-square rounded-xl cursor-pointer mb-2 bg-white border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="text-center">
                              <span className="text-xs text-gray-400">이미지 업로드</span>
                              <p className="text-[10px] text-gray-300 mt-0.5">정사각형 권장 (480×480px)</p>
                              <p className="text-[10px] text-gray-300">PNG, JPG / 최대 5MB</p>
                            </div>
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                              onChange={(e) => handleOptionImageChange(qIdx, oIdx, e)} />
                          </label>
                        )}
                        <input type="text" value={q.options[oIdx] || ''}
                          onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                          placeholder="설명 (선택)"
                          className="w-full rounded-md px-2 py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none border border-gray-200 bg-white" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-6">
                    <TimeLimitSelect q={q} qIdx={qIdx} updateQuestion={updateQuestion} />
                  </div>
                </>
              )}

              {/* OX time limit */}
              {q.questionType === 'ox' && (
                <div className="flex items-center gap-6 mt-2">
                  <TimeLimitSelect q={q} qIdx={qIdx} updateQuestion={updateQuestion} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add question buttons */}
        <div className="mt-8 flex gap-4">
          <button onClick={() => addQuestion('text')}
            className="flex-1 rounded-xl py-3 text-sm font-medium text-blue-600 bg-blue-50 border-2 border-dashed border-blue-200 hover:bg-blue-100 transition-colors">
            + 4지선다
          </button>
          <button onClick={() => addQuestion('ox')}
            className="flex-1 rounded-xl py-3 text-sm font-medium text-emerald-600 bg-emerald-50 border-2 border-dashed border-emerald-200 hover:bg-emerald-100 transition-colors">
            + OX퀴즈
          </button>
          <button onClick={() => addQuestion('image')}
            className="flex-1 rounded-xl py-3 text-sm font-medium text-purple-600 bg-purple-50 border-2 border-dashed border-purple-200 hover:bg-purple-100 transition-colors">
            + 이미지 보기
          </button>
        </div>

        <div className="h-12" />
      </main>
    </div>
  )
}

function TimeLimitSelect({ q, qIdx, updateQuestion }: {
  q: QuestionCard; qIdx: number;
  updateQuestion: (index: number, partial: Partial<QuestionCard>) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500">시간:</span>
      <select value={q.timeLimit}
        onChange={(e) => updateQuestion(qIdx, { timeLimit: Number(e.target.value) })}
        className="rounded-md px-2 py-1 text-sm text-gray-700 outline-none border border-gray-200 bg-white cursor-pointer">
        <option value={10}>10초</option>
        <option value={15}>15초</option>
        <option value={20}>20초</option>
        <option value={30}>30초</option>
        <option value={45}>45초</option>
        <option value={60}>60초</option>
      </select>
    </div>
  )
}
