export interface ISearchUser {
    id: number
    first_name: string
    last_name: string
    email: string
    phone_number: string
}

export interface ISingUpUser {
    first_name: string
    last_name: string
    email: string
    phone_number: string
    password: string
    confirm_password: string
}

export interface ILoginUser {
    email: string
    password: string
}
