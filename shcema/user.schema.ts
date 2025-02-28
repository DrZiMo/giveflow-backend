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
    body('password')
        .isString()
        .withMessage('Enter valid password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    body('confirm_password')
        .isString()
        .withMessage('Enter valid password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .custom((value, { req }) => value === req.body)
        .withMessage('Password do not match'),
]

export const userPhoneNumberSchema = [
    body('phone_number')
        .isString()
        .withMessage('Phone number must be a valid string')
        .isLength({ min: 9, max: 14 })
        .withMessage('Phone number must be between 9 and 14 characters'),
]
