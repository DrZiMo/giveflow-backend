export interface ISearchUser {
    id: number
    first_name: string
    last_name: string
    email: string
}

export interface ISingUpUser {
    first_name: string
    last_name: string
    email: string
    password: string
    confirm_password: string
}
