export interface ISinglePage {
    id: string
}

export interface ISeacrPage {
    name: string
}

export interface ICreatePage {
    name: string
    description: string
}

export interface IUpdatePage {
    id: string
    name: string
    description: string
}

export interface IDeletePageTemp {
    id: string
}

export interface IRestorePage {
    id: string
}

export interface IChangeProfilePic {
    id: string
    profile_pic: string
}

export interface IChangeCoverPic {
    id: string
    cover_pic: string
}
