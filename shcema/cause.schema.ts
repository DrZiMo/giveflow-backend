import { body } from 'express-validator'

export const CreateCauseSchema = [
    body('giving_page_id')
        .isString()
        .withMessage('Giving page ID must be a string'),
    body('name').isString().withMessage('Name must be a string'),
    body('short_description')
        .isString()
        .withMessage('Short description must be a string'),
    body('long_description')
        .isString()
        .withMessage('Long description must be a string'),
    body('amount_needed')
        .isNumeric()
        .withMessage('Amount needed must be a number'),
    body('category_id').isString().withMessage('Category ID must be a string'),
    body('urgency_level')
        .isString()
        .withMessage('Urgency level must be a string'),
    body('expiration_date')
        .isISO8601()
        .withMessage('Expiration date must be a valid date'),
]
