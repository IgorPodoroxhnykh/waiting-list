// types/admin.ts
export interface Box {
    id: number
    number: number
    status: 'free' | 'occupied' | 'waiting'
    clientType?: 'scheduled' | 'live'
    clientName?: string
    carBrand?: string
    carModel?: string
    carColor?: string
    carNumber?: string
    startTime?: string
    expectedEndTime?: string
    progress?: number
    isWashed?: boolean
    price?: number
    isPaid?: boolean
}

export interface Ticket {
    id: number
    type: 'scheduled' | 'live'
    time: string
    clientName: string
    phone: string
    carBrand: string
    carModel: string
    carColor: string
    carNumber: string
    services: string
    price: number
    isPaid: boolean
    arrived: boolean
    inProgress: boolean
    completed: boolean
    boxNumber?: number
    position?: number
    estimatedStartTime?: string
}

export interface Settings {
    washTime: number
    confirmationInterval: number
    boxCount: number
    workStart: string
    workEnd: string
}

export interface AdminData {
    boxes: Box[]
    appointments: Ticket[]
    liveQueue: Ticket[]
    settings: Settings
}

export type TicketType = 'appointment' | 'liveQueue'