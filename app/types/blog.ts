export interface IBlog {
    id: number
    uuid: string
    title: string
    description: string
    publish_time: string
    tags: Tag[]
}

export interface Tag {
    id: number
    name: string
    count: number
}