export type Aluno = {
  id: string
  full_name: string
  classe: string | null
  turma: string | null
}

export type Classe = { id: number; name: string }
export type Turma = { id: number; name: string; class_id: number }

export type Disciplina = {
  id: number
  name: string
  classes_aplicaveis: number[]
}

export type Nota = {
  student_id: string
  disciplina_id: number
  valor: number | null
  publicado: boolean
}

export type NotaLocal = {
  disciplina_id: number
  valor: number | null
  publicado: boolean
}

export type Situacao = {
  regular: boolean
  meses_em_falta: string[]
  total_meses: number
  pagos: number
}