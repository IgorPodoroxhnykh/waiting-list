export interface QueueTicket {
    id: string
    position: number
    totalInQueue: number
    waitTimeMinutes: number
    arriveBy: Date
    serviceName: string
    carInfo: string
}