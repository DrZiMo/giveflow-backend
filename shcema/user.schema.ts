import { body } from 'express-validator'

export const SingupUserShcema = [
    body('first_name')
        .isString()
        .withMessage('First name must be a valid string')
        .isLength({ min: 3, max: 20 })
        .withMessage('First name must be between 3 and 20 characters'),
    body('last_name')
        .isString()
        .withMessage('Last name must be a valid string')
        .isLength({ min: 3, max: 20 })
        .withMessage('Last name must be between 3 and 20 characters'),
    body('email').isEmail().withMessage('Enter valid email address'),
]
