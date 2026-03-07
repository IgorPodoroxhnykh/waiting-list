"use client"

import { useState } from 'react'

// Типы данных
interface Box {
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

interface Ticket {
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

interface Settings {
    washTime: number
    confirmationInterval: number
    boxCount: number
    workStart: string
    workEnd: string
}

// Моковые данные
const mockBoxes: Box[] = [
    { id: 1, number: 1, status: 'occupied', clientType: 'scheduled', clientName: 'Иван Петров', carBrand: 'Toyota', carModel: 'Camry', carColor: 'Чёрный', carNumber: 'А777АА', startTime: '14:30', expectedEndTime: '15:00', progress: 50, isWashed: false, price: 1200, isPaid: true },
    { id: 2, number: 2, status: 'occupied', clientType: 'live', clientName: 'Сергей Сидоров', carBrand: 'BMW', carModel: 'X5', carColor: 'Белый', carNumber: 'В555ОР', startTime: '14:45', expectedEndTime: '15:15', progress: 30, isWashed: false, price: 1500, isPaid: false },
    { id: 3, number: 3, status: 'free' },
    { id: 4, number: 4, status: 'free' },
    { id: 5, number: 5, status: 'free' },
]

const mockTickets: Ticket[] = [
    { id: 1, type: 'scheduled', time: '14:00', clientName: 'Николай Морозов', phone: '+7 918 222-33-44', carBrand: 'Kia', carModel: 'Optima', carColor: 'Синий', carNumber: 'Н555НН', services: 'Мойка кузова, коврики', price: 1200, isPaid: true, arrived: true, inProgress: true, completed: true, boxNumber: 1 },
    { id: 2, type: 'scheduled', time: '15:00', clientName: 'Алексей Иванов', phone: '+7 999 123-45-67', carBrand: 'Hyundai', carModel: 'Solaris', carColor: 'Серебристый', carNumber: 'С333СК', services: 'Комплексная мойка + полировка', price: 2500, isPaid: false, arrived: true, inProgress: false, completed: false, boxNumber: 3 },
    { id: 3, type: 'scheduled', time: '15:30', clientName: 'Мария Козлова', phone: '+7 987 654-32-10', carBrand: 'Volkswagen', carModel: 'Polo', carColor: 'Белый', carNumber: 'К555КК', services: 'Мойка кузова', price: 800, isPaid: true, arrived: false, inProgress: false, completed: false },
    { id: 4, type: 'scheduled', time: '16:00', clientName: 'Дмитрий Смирнов', phone: '+7 912 345-67-89', carBrand: 'Lada', carModel: 'Vesta', carColor: 'Красный', carNumber: 'М777ММ', services: 'Нано мойка, воск', price: 1800, isPaid: false, arrived: false, inProgress: false, completed: false },
    { id: 5, type: 'scheduled', time: '16:30', clientName: 'Елена Волкова', phone: '+7 905 111-22-33', carBrand: 'Renault', carModel: 'Duster', carColor: 'Зелёный', carNumber: 'Е123ЕЕ', services: 'Мойка кузова, салона', price: 1500, isPaid: false, arrived: false, inProgress: false, completed: false },
    { id: 6, type: 'live', time: '14:20', clientName: 'Пётр Новиков', phone: '+7 917 333-44-55', carBrand: 'Toyota', carModel: 'Corolla', carColor: 'Серый', carNumber: 'О777ОО', services: 'Экспресс мойка', price: 500, isPaid: true, arrived: true, inProgress: false, completed: false, position: 1, estimatedStartTime: '15:20' },
    { id: 7, type: 'live', time: '14:35', clientName: 'Анна Соколова', phone: '+7 920 444-55-66', carBrand: 'Honda', carModel: 'Civic', carColor: 'Чёрный', carNumber: 'А555АА', services: 'Мойка кузова, керамика', price: 3000, isPaid: false, arrived: true, inProgress: false, completed: false, position: 2, estimatedStartTime: '15:40' },
    { id: 8, type: 'live', time: '14:50', clientName: 'Виктор Кузнецов', phone: '+7 921 555-66-77', carBrand: 'Nissan', carModel: 'Almera', carColor: 'Синий', carNumber: 'В888ВВ', services: 'Мойка кузова', price: 700, isPaid: false, arrived: false, inProgress: false, completed: false, position: 3, estimatedStartTime: '16:00' },
]

const mockSettings: Settings = {
    washTime: 30,
    confirmationInterval: 15,
    boxCount: 5,
    workStart: '08:00',
    workEnd: '22:00',
}

// UI компоненты
const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'success' | 'danger' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
}) => {
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        success: 'bg-green-600 hover:bg-green-700 text-white',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
        ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
    }

    const sizes = {
        sm: 'px-2 py-1 text-xs rounded-md',
        md: 'px-3 py-1.5 text-sm rounded-lg',
        lg: 'px-4 py-2 text-base rounded-lg',
    }

    return (
        <button
            className={`font-medium transition-colors inline-flex items-center justify-center ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}

// Компонент карточки бокса
const BoxCard = ({ box }: { box: Box }) => {
    const [isWashed, setIsWashed] = useState(box.isWashed || false)
    const [isPaid, setIsPaid] = useState(box.isPaid || false)

    const statusStyles = {
        free: 'border-green-300 bg-green-50',
        waiting: 'border-gray-200 bg-white',
        occupied: 'border-red-300 bg-red-50',
    }

    const isOccupied = box.status === 'occupied'
    const isFree = box.status === 'free'

    return (
        <div className={`rounded-xl border-2 p-2 sm:p-3 transition-all ${statusStyles[box.status]} ${isWashed ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start mb-1">
                <span className={`text-base sm:text-lg font-bold ${isFree ? 'text-green-700' : isOccupied ? 'text-red-700' : 'text-gray-700'}`}>
                    Бокс {box.number}
                </span>
            </div>

            {box.status !== 'free' ? (
                <div className="space-y-1">
                    <div className="text-xs">
                        <span className={`px-1 py-0.5 rounded ${box.clientType === 'scheduled' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'}`}>
                            {box.clientType === 'scheduled' ? 'Запись' : 'Живой'}
                        </span>
                    </div>
                    <div className="font-medium text-gray-800 text-xs sm:text-sm truncate">{box.clientName}</div>
                    <div className="text-xs text-gray-600">{box.carBrand} {box.carModel}</div>
                    <div className="text-xs text-gray-600">{box.carColor}</div>
                    <div className="font-mono text-xs font-semibold">{box.carNumber}</div>
                    <div className="text-xs text-gray-500">{box.startTime} → {box.expectedEndTime}</div>

                    {/* Сумма и оплата */}
                    <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Сумма:</span>
                            <span className="font-bold text-sm sm:text-base text-green-600">{box.price || 0} ₽</span>
                        </div>
                        <div
                            className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg border-2 cursor-pointer transition-all ${isPaid
                                    ? 'bg-green-100 border-green-400 shadow-sm'
                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                }`}
                            onClick={() => setIsPaid(!isPaid)}
                        >
                            <div className={`flex items-center justify-center w-3 h-3 rounded-full border ${isPaid
                                    ? 'bg-green-500 border-green-500'
                                    : 'border-gray-300'
                                }`}>
                                {isPaid && (
                                    <svg className="w-1.5 h-1.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <span className={`text-[10px] sm:text-xs font-semibold ${isPaid ? 'text-green-700' : 'text-gray-400'}`}>
                                {isPaid ? 'Оплачено' : 'Не оплачено'}
                            </span>
                            {isPaid && (
                                <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                            )}
                        </div>
                    </div>

                    {/* Чекбокс Помыт */}
                    <div className="mt-1">
                        <div
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 cursor-pointer transition-all ${isWashed
                                    ? 'bg-green-100 border-green-400 shadow-sm'
                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                }`}
                            onClick={() => setIsWashed(!isWashed)}
                        >
                            <div className={`flex items-center justify-center w-4 h-4 rounded-full border-2 transition-all ${isWashed
                                    ? 'bg-green-500 border-green-500'
                                    : 'border-gray-300'
                                }`}>
                                {isWashed && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <span className={`text-xs font-semibold ${isWashed ? 'text-green-700' : 'text-gray-600'}`}>
                                Помыт
                            </span>
                            {isWashed && (
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse ml-auto" />
                            )}
                        </div>
                    </div>

                    {/* Кнопка завершить */}
                    <Button variant="success" size="sm" className="w-full mt-1">
                        Завершить
                    </Button>
                </div>
            ) : (
                <div className="text-sm text-green-600 font-medium py-2 text-center">Свободен</div>
            )}
        </div>
    )
}

// Компонент карточки клиента
const TicketCard = ({ ticket }: { ticket: Ticket }) => {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ticket.type === 'scheduled' ? 'bg-purple-100' : 'bg-orange-100'}`}>
                        {ticket.type === 'scheduled' ? (
                            <span className="text-purple-600 font-bold text-xs">З</span>
                        ) : (
                            <span className="text-orange-600 font-bold text-sm">#{ticket.position}</span>
                        )}
                    </div>
                    <div>
                        <div className="font-medium text-gray-800 text-sm">{ticket.clientName}</div>
                        <div className="text-xs text-gray-500">{ticket.phone}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-mono font-semibold text-sm">{ticket.time}</div>
                    <div className="text-xs text-gray-500">{ticket.type === 'scheduled' ? 'запись' : 'прибыл'}</div>
                </div>
            </div>

            <div className="bg-gray-50 rounded-md p-2 mb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-gray-800">{ticket.carBrand} {ticket.carModel}</div>
                        <div className="text-xs text-gray-500">{ticket.carColor}</div>
                    </div>
                    <div className="font-mono font-bold text-sm bg-white px-2 py-1 rounded border">{ticket.carNumber}</div>
                </div>
            </div>

            <div className="bg-blue-50 rounded-md p-2 mb-2">
                <div className="text-xs text-gray-500 mb-1">Услуги</div>
                <div className="text-sm text-gray-800">{ticket.services || 'Не указано'}</div>
            </div>

            {/* Оплачено */}
            <div className="flex items-center justify-between bg-green-50 rounded-md p-2 mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Сумма:</span>
                    <span className="font-bold text-lg text-green-600">{ticket.price} ₽</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 transition-all ${ticket.isPaid
                        ? 'bg-green-100 border-green-400 shadow-sm'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                    <div className={`flex items-center justify-center w-4 h-4 rounded-full border-2 ${ticket.isPaid
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300'
                        }`}>
                        {ticket.isPaid && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        )}
                    </div>
                    <span className={`text-xs font-semibold ${ticket.isPaid ? 'text-green-700' : 'text-gray-400'
                        }`}>
                        {ticket.isPaid ? 'Оплачено' : 'Не оплачено'}
                    </span>
                    {ticket.isPaid && (
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    )}
                </div>
            </div>

            {/* Чекбоксы "Прибыл" и "В работе" */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex gap-2">
                    {/* Прибыл */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 transition-all ${ticket.arrived
                            ? 'bg-green-100 border-green-400 shadow-sm'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                        <div className={`flex items-center justify-center w-4 h-4 rounded-full border-2 ${ticket.arrived
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300'
                            }`}>
                            {ticket.arrived && (
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <span className={`text-xs font-semibold ${ticket.arrived ? 'text-green-700' : 'text-gray-400'
                            }`}>
                            Прибыл
                        </span>
                        {ticket.arrived && (
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        )}
                    </div>

                    {/* В работе */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 transition-all ${ticket.inProgress
                            ? 'bg-blue-100 border-blue-400 shadow-sm'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                        <div className={`flex items-center justify-center w-4 h-4 rounded-full border-2 ${ticket.inProgress
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300'
                            }`}>
                            {ticket.inProgress && (
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <span className={`text-xs font-semibold ${ticket.inProgress ? 'text-blue-700' : 'text-gray-400'
                            }`}>
                            В работе
                        </span>
                        {ticket.inProgress && (
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        )}
                    </div>
                </div>
                {ticket.boxNumber && (
                    <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-sm font-bold">
                        Бокс {ticket.boxNumber}
                    </div>
                )}
            </div>

            {!ticket.completed && (
                <div className="flex gap-2">
                    <Button variant="primary" size="sm" className="flex-1">Изменить</Button>
                    <Button variant="danger" size="sm" className="flex-1">Отменить</Button>
                </div>
            )}
        </div>
    )
}

export default function AdminPage() {
    const [filter, setFilter] = useState<'all' | 'scheduled' | 'live'>('all')
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [addModalOpen, setAddModalOpen] = useState(false)

    const freeBoxes = mockBoxes.filter(b => b.status === 'free').length
    const inLiveQueue = mockTickets.filter(t => t.type === 'live' && !t.completed).length
    const nextScheduled = mockTickets.find(t => t.type === 'scheduled' && !t.completed)
    const estimatedWait = 40

    const currentTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    const currentDate = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

    const filteredTickets = mockTickets.filter(ticket => {
        if (filter === 'all') return !ticket.completed
        return ticket.type === filter && !ticket.completed
    })

    return (
        <div className="min-h-screen bg-gray-50">
            {/* HEADER со статистикой - всегда виден */}
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="px-2 sm:px-4 py-2">
                    {/* Верхняя строка: кнопки слева, время/дата справа */}
                    <div className="flex items-center justify-between">
                        {/* Кнопки слева */}
                        <div className="flex gap-2">
                            <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)}>
                                + Добавить
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
                                Настройки
                            </Button>
                            <Button variant="secondary" size="sm">
                                Обновить
                            </Button>
                        </div>

                        {/* Время и дата справа */}
                        <div className="flex items-center gap-2">
                            <div className="text-lg sm:text-xl font-mono font-bold text-blue-600">{currentTime}</div>
                            <div className="text-xs sm:text-sm text-gray-500 capitalize hidden sm:block">{currentDate}</div>
                        </div>
                    </div>

                    {/* Статистика - такой же высотой как верхний блок */}
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200 flex flex-col justify-center">
                            <div className="text-lg sm:text-xl font-bold text-green-600">{freeBoxes}</div>
                            <div className="text-[10px] sm:text-xs text-green-700">Свободно</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-2 text-center border border-orange-200 flex flex-col justify-center">
                            <div className="text-lg sm:text-xl font-bold text-orange-500">{inLiveQueue}</div>
                            <div className="text-[10px] sm:text-xs text-orange-600">В очереди</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-200 flex flex-col justify-center">
                            <div className="text-lg sm:text-xl font-semibold text-purple-600">{nextScheduled?.time || '—'}</div>
                            <div className="text-[10px] sm:text-xs text-purple-600">Запись</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-200 flex flex-col justify-center">
                            <div className="text-lg sm:text-xl font-bold text-blue-600">~{estimatedWait}</div>
                            <div className="text-[10px] sm:text-xs text-blue-600">Ожидание</div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-2 sm:px-4 py-3 sm:py-6">
                {/* БОКСЫ */}
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Боксы</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
                        {mockBoxes.map(box => (
                            <BoxCard key={box.id} box={box} />
                        ))}
                    </div>
                </div>

                {/* СПИСОК ОЧЕРЕДИ */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-3 sm:px-4 py-2 sm:py-3 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <h2 className="font-semibold text-gray-800 text-sm sm:text-base">Очередь и записи</h2>
                        <div className="flex gap-1 sm:gap-2">
                            <Button
                                variant={filter === 'all' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setFilter('all')}
                            >
                                Все
                            </Button>
                            <Button
                                variant={filter === 'scheduled' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setFilter('scheduled')}
                            >
                                Записи
                            </Button>
                            <Button
                                variant={filter === 'live' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setFilter('live')}
                            >
                                Живая
                            </Button>
                        </div>
                    </div>
                    <div className="p-2">
                        {filteredTickets.map(ticket => (
                            <TicketCard key={ticket.id} ticket={ticket} />
                        ))}
                        {filteredTickets.length === 0 && (
                            <div className="p-6 text-center text-gray-500 text-sm">Нет клиентов</div>
                        )}
                    </div>
                </div>
            </main>

            {/* МОДАЛКА НАСТРОЕК */}
            {settingsOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 sm:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg sm:text-xl font-bold">Настройки</h2>
                            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(false)}>
                                ✕
                            </Button>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Время мойки (мин)</label>
                                <input type="number" defaultValue={mockSettings.washTime} className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Интервал подтверждения (мин)</label>
                                <input type="number" defaultValue={mockSettings.confirmationInterval} className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Количество боксов</label>
                                <input type="number" defaultValue={mockSettings.boxCount} className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Начало</label>
                                    <input type="time" defaultValue={mockSettings.workStart} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Конец</label>
                                    <input type="time" defaultValue={mockSettings.workEnd} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                            <Button variant="primary" className="flex-1">Сохранить</Button>
                            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>Отмена</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* МОДАЛКА ДОБАВЛЕНИЯ */}
            {addModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg sm:text-xl font-bold">Добавить клиента</h2>
                            <Button variant="ghost" size="sm" onClick={() => setAddModalOpen(false)}>
                                ✕
                            </Button>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
                                <select className="w-full border rounded-lg px-3 py-2">
                                    <option value="scheduled">По записи</option>
                                    <option value="live">Живая очередь</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                                    <input type="date" className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
                                    <input type="time" className="w-full border rounded-lg px-3 py-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                                <input type="text" placeholder="Иван Иванов" className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                                <input type="tel" placeholder="+7 999 123-45-67" className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Марка</label>
                                <input type="text" placeholder="Toyota" className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Модель</label>
                                <input type="text" placeholder="Camry" className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Цвет</label>
                                <input type="text" placeholder="Чёрный" className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Гос номер</label>
                                <input type="text" placeholder="А777АА" className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Услуги</label>
                                <textarea placeholder="Мойка кузова, коврики..." rows={2} className="w-full border rounded-lg px-3 py-2 resize-none"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽)</label>
                                <input type="number" placeholder="1000" className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isPaid" className="w-4 h-4 accent-green-600 rounded" />
                                <label htmlFor="isPaid" className="text-sm text-gray-700">Оплачено</label>
                            </div>
                        </div>
                        <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                            <Button variant="primary" className="flex-1">Добавить</Button>
                            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>Отмена</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}