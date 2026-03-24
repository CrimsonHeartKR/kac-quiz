import { supabase } from './supabase'

export interface Operator {
  id: string
  email: string
  name: string
  role: 'admin' | 'host'
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

// SHA-256 해시 (브라우저 내장 Web Crypto API)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 로그인
export async function loginOperator(email: string, password: string): Promise<Operator> {
  const hash = await hashPassword(password)
  const { data, error } = await supabase
    .from('operators')
    .select('*')
    .eq('email', email)
    .eq('password_hash', hash)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
  }

  // 마지막 로그인 시간 업데이트
  await supabase
    .from('operators')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.id)

  // 세션 저장
  localStorage.setItem('operator_id', data.id)
  localStorage.setItem('operator_role', data.role)
  localStorage.setItem('operator_name', data.name)
  localStorage.setItem('operator_email', data.email)

  return data as Operator
}

// 로그아웃
export function logoutOperator() {
  localStorage.removeItem('operator_id')
  localStorage.removeItem('operator_role')
  localStorage.removeItem('operator_name')
  localStorage.removeItem('operator_email')
}

// 현재 로그인 사용자 확인
export function getCurrentOperator(): Operator | null {
  const id = localStorage.getItem('operator_id')
  if (!id) return null
  return {
    id,
    email: localStorage.getItem('operator_email') || '',
    name: localStorage.getItem('operator_name') || '',
    role: (localStorage.getItem('operator_role') as 'admin' | 'host') || 'host',
    is_active: true,
    created_at: '',
    last_login_at: null,
  }
}

// 운영자 계정 생성 (관리자 전용)
export async function createOperator(email: string, password: string, name: string, role: 'admin' | 'host'): Promise<void> {
  const hash = await hashPassword(password)
  const { error } = await supabase
    .from('operators')
    .insert({ email, password_hash: hash, name, role })

  if (error) {
    if (error.code === '23505') throw new Error('이미 존재하는 이메일입니다.')
    throw new Error('계정 생성에 실패했습니다.')
  }
}

// 운영자 비밀번호 변경
export async function updateOperatorPassword(id: string, newPassword: string): Promise<void> {
  const hash = await hashPassword(newPassword)
  await supabase.from('operators').update({ password_hash: hash }).eq('id', id)
}

// 운영자 활성/비활성
export async function toggleOperatorActive(id: string, isActive: boolean): Promise<void> {
  await supabase.from('operators').update({ is_active: isActive }).eq('id', id)
}

// 운영자 삭제
export async function deleteOperator(id: string): Promise<void> {
  await supabase.from('operators').delete().eq('id', id)
}
