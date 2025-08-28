import { URGENCY_LEVEL } from '@prisma/client'

export interface IGetSingleCause {
  id: string
}

export interface IAddNewCause {
  category_id: string
  name: string
  short_description: string
  long_description: string
  cause_pic: string
  amount_needed: number
  urgency_level: URGENCY_LEVEL
  expiration_date: Date
}

export interface IUpdateCause {
  id: string
  name: string
  short_description: string
  long_description: string
  amount_needed: number
  urgency_level: URGENCY_LEVEL
  expiration_date: Date
}
