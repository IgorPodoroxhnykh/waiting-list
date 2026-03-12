// app/admin/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { AdminData, Ticket, TicketType, Settings } from '@/types/admin'
import { fetchAdminData, updateStatus, updateTicket, deleteTicket } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { BoxCard } from '@/components/admin/BoxCard'
import { TicketCard } from '@/components/admin/TicketCard'
import { SettingsModal } from '@/components/admin/SettingsModal'
import { AddClientModal } from '@/components/admin/AddClientModal'
import { EditClientModal } from '@/components/admin/EditClientModal'
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal'

const DEFAULT_SETTINGS: Settings = {
    washTime: 30,
    confirmationInterval: 15,
    boxCount: 5,
    workStart: '08:00',
    workEnd: '22:00',
}

export default function AdminPage() {
    const [data, setData] = useState<AdminData | null>(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'scheduled' | 'live'>('all')

    const [settingsOpen, setSettingsOpen] = useState(false)
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)

    const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
    const [editType, setEditType] = useState<TicketType>('appointment')

    const [deletingTicket, setDeletingTicket] = useState<{
        id: number
        type: TicketType
        clientName: string
    } | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const result = await fetchAdminData()
        setData(result)
        setLoading(false)
    }

    const handleStatusChange = async (
        id: number,
        type: TicketType,
        field: string,
        value: boolean
    ) => {
        const result = await updateStatus(type, id, field, value)
        if (result.success) {
            loadData()
        }
    }

    const handleStartWash = async (id: number, type: TicketType) => {
        const result = await updateStatus(type, id, 'inProgress', true)
        if (result.success) {
            setTimeout(() => loadData(), 100)
        } else {
            alert(result.error || 'Ошибка при запуске мойки')
        }
    }

    const handleWashStatusChange = async (id: number | string, field: string, value: boolean) => {
        const result = await updateStatus('washSession', id, field, value)
        if (result.success) {
            loadData()
        }
    }

    const handleComplete = async (id: number | string) => {
        const result = await updateStatus('washSession', id, 'complete', true)
        if (result.success) {
            loadData()
        }
    }

    const handleEdit = (id: number, type: TicketType) => {
        const ticket =
            type === 'appointment'
                ? data?.appointments.find((t) => t.id === id)
                : data?.liveQueue.find((t) => t.id === id)
        if (ticket) {
            setEditingTicket(ticket)
            setEditType(type)
            setEditModalOpen(true)
        }
    }

    const handleSaveEdit = async (formData: Partial<Ticket>) => {
        if (!editingTicket) return

        const result = await updateTicket(editType, editingTicket.id, formData)
        if (result.success) {
            setEditModalOpen(false)
            setEditingTicket(null)
            loadData()
        } else {
            alert(result.error || 'Ошибка сохранения')
        }
    }

    const handleCancel = (id: number, type: TicketType) => {
        const ticket =
            type === 'appointment'
                ? data?.appointments.find((t) => t.id === id)
                : data?.liveQueue.find((t) => t.id === id)
        if (ticket) {
            setDeletingTicket({ id, type, clientName: ticket.clientName })
            setDeleteModalOpen(true)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deletingTicket) return

        const result = await deleteTicket(deletingTicket.type, deletingTicket.id)
        if (result.success) {
            setDeleteModalOpen(false)
            setDeletingTicket(null)
            loadData()
        } else {
            alert(result.error || 'Ошибка при отмене')
        }
    }

    const freeBoxes = data?.boxes.filter((b) => b.status === 'free').length ?? 0
    const allTickets = [...(data?.appointments ?? []), ...(data?.liveQueue ?? [])]
    const inLiveQueue = allTickets.filter((t) => t.type === 'live' && !t.completed).length
    const nextScheduled = allTickets.find((t) => t.type === 'scheduled' && !t.completed)
    const estimatedWait = 40

    const currentTime = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    })

    const currentDate = new Date().toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    })

    const filteredTickets = allTickets.filter((ticket) => {
        if (filter === 'all') return !ticket.completed
        return ticket.type === filter && !ticket.completed
    })

    const settings = data?.settings ?? DEFAULT_SETTINGS

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">Загрузка...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="px-2 sm:px-4 py-2">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)}>
                                + Добавить
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
                                Настройки
                            </Button>
                            <Button variant="secondary" size="sm" onClick={loadData}>
                                Обновить
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-lg sm:text-xl font-mono font-bold text-blue-600">
                                {currentTime}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 capitalize hidden sm:block">
                                {currentDate}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-2">
                        <StatCard value={freeBoxes} label="Свободно" color="green" />
                        <StatCard value={inLiveQueue} label="В очереди" color="orange" />
                        <StatCard value={nextScheduled?.time || '—'} label="Запись" color="purple" />
                        <StatCard value={`~${estimatedWait}`} label="Ожидание" color="blue" />
                    </div>
                </div>
            </header>

            <main className="px-2 sm:px-4 py-3 sm:py-6">
                <section className="mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">
                        Боксы
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
                        {data?.boxes.map((box) => (
                            <BoxCard
                                key={box.id}
                                box={box}
                                onWashStatusChange={handleWashStatusChange}
                                onComplete={handleComplete}
                            />
                        ))}
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-3 sm:px-4 py-2 sm:py-3 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <h2 className="font-semibold text-gray-800 text-sm sm:text-base">
                            Очередь и записи
                        </h2>
                        <FilterButtons filter={filter} setFilter={setFilter} />
                    </div>
                    <div className="p-2">
                        {filteredTickets.map((ticket) => (
                            <TicketCard
                                key={ticket.id}
                                ticket={ticket}
                                onStatusChange={handleStatusChange}
                                onStartWash={handleStartWash}
                                onEdit={handleEdit}
                                onCancel={handleCancel}
                            />
                        ))}
                        {filteredTickets.length === 0 && (
                            <div className="p-6 text-center text-gray-500 text-sm">Нет клиентов</div>
                        )}
                    </div>
                </section>
            </main>

            <SettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                settings={settings}
            />

            <AddClientModal
                open={addModalOpen}
                onClose={() => setAddModalOpen(false)}
            />

            <EditClientModal
                open={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                ticket={editingTicket}
                onSave={handleSaveEdit}
            />

            <DeleteConfirmModal
                open={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false)
                    setDeletingTicket(null)
                }}
                clientName={deletingTicket?.clientName || ''}
                onConfirm={handleConfirmDelete}
            />
        </div>
    )
}

function StatCard({
    value,
    label,
    color,
}: {
    value: number | string
    label: string
    color: 'green' | 'orange' | 'purple' | 'blue'
}) {
    const colors = {
        green: 'bg-green-50 border-green-200 text-green-600 text-green-700',
        orange: 'bg-orange-50 border-orange-200 text-orange-500 text-orange-600',
        purple: 'bg-purple-50 border-purple-200 text-purple-600 text-purple-600',
        blue: 'bg-blue-50 border-blue-200 text-blue-600 text-blue-600',
    }
    const [bg, border, textValue, textLabel] = colors[color].split(' ')

    return (
        <div className={`${bg} rounded-lg p-2 text-center border ${border} flex flex-col justify-center`}>
            <div className={`text-lg sm:text-xl font-bold ${textValue}`}>{value}</div>
            <div className={`text-[10px] sm:text-xs ${textLabel}`}>{label}</div>
        </div>
    )
}

function FilterButtons({
    filter,
    setFilter,
}: {
    filter: 'all' | 'scheduled' | 'live'
    setFilter: (f: 'all' | 'scheduled' | 'live') => void
}) {
    return (
        <div className="flex gap-1 sm:gap-2">
            {(['all', 'scheduled', 'live'] as const).map((f) => (
                <Button
                    key={f}
                    variant={filter === f ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setFilter(f)}
                >
                    {f === 'all' ? 'Все' : f === 'scheduled' ? 'Записи' : 'Живая'}
                </Button>
            ))}
        </div>
    )
}