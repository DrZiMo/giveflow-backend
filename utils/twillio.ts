import twilio, {Twilio} from 'twilio'

export const client: Twilio = new (twilio as any) (
    process.env.TWILLIO_ACCOUNT_SID,
    process.env.TWILLIO_AUTH_TOKEN
)