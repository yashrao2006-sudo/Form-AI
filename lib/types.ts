export type InputType = 'currency' | 'number' | 'percent'
export type OutputFormat = 'currency' | 'percent' | 'number'

export interface InputField {
  id: string
  label: string
  type: InputType
}

export interface OutputField {
  label: string
  formula: string
  format: OutputFormat
}

export interface FormSchema {
  title: string
  inputs: InputField[]
  outputs: OutputField[]
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface Form {
  id: string
  schema: FormSchema
  created_at: string
  updated_at: string
}
