// types/admin.ts
export interface Box {
    id: number | string
    number: number
    status: 'free' | 'occupied' | 'waiting'
    clientType?: 'scheduled' | 'live' | 'admin'
    source?: 'scheduled' | 'live' | 'admin'
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
    queueEntryId?: string
}

export interface Ticket {
    id: number
    type: 'scheduled' | 'live'
    time: string
    estimatedStartTime?: string  // Добавить
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
}

export interface Settings {
    washTime: number
    confirmationInterval: number
    boxCount: number
    workStart: string
    workEnd: string
}

export interface AdminStats {
    totalInQueue: number
    liveCount: number
    scheduledCount: number
    adminCount: number
    completedToday: number
    inService: number
    freeBoxes: number
}

export interface AdminData {
    boxes: Box[]
    appointments: Ticket[]
    liveQueue: Ticket[]
    settings: Settings
    stats?: AdminStats
}

export type TicketType = 'appointment' | 'liveQueue'