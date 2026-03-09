import 'dotenv/config'
import { PrismaClient, AppointmentStatus, LiveQueueStatus, WashStatus, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

// Игнорируем ошибки SSL (для облачной БД)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const main = async () => {
    const connectionString = process.env.DATABASE_URL || ''
    console.log('🔌 Подключение к БД...')

    // Создаём пул
    const pool = new pg.Pool({
        connectionString: connectionString + (connectionString.includes('?') ? '&' : '?') + 'sslmode=require',
        ssl: {
            rejectUnauthorized: false
        }
    })

    // Создаём адаптер
    const adapter = new PrismaPg(pool)

    // Инициализируем PrismaClient
    const prisma = new PrismaClient({ adapter })

    // ===========================================
    // ОЧИСТКА БД
    // ===========================================
    console.log('🧹 Очистка базы данных...')

    await prisma.$transaction([
        prisma.washSession.deleteMany(),
        prisma.appointment.deleteMany(),
        prisma.liveQueue.deleteMany(),
        prisma.eventLog.deleteMany(),
        prisma.user.deleteMany(),
        prisma.client.deleteMany(),
        prisma.setting.deleteMany(),
        prisma.box.deleteMany(),
    ])

    console.log('✅ База данных очищена\n')

    // ===========================================
    // НАСТРОЙКИ
    // ===========================================
    console.log('📝 Создание настроек...')

    await prisma.setting.createMany({
        data: [
            { key: 'washDuration', value: 30, description: 'Время мойки по умолчанию (минуты)' },
            { key: 'confirmationInterval', value: 15, description: 'Интервал подтверждения записи (минуты)' },
            { key: 'boxCount', value: 5, description: 'Количество боксов' },
            { key: 'workStart', value: '08:00', description: 'Начало рабочего дня' },
            { key: 'workEnd', value: '22:00', description: 'Конец рабочего дня' },
        ],
    })

    // ===========================================
    // БОКСЫ
    // ===========================================
    console.log('🚧 Создание боксов...')

    await prisma.box.createMany({
        data: [
            { number: 1, isActive: true },
            { number: 2, isActive: true },
            { number: 3, isActive: true },
            { number: 4, isActive: true },
            { number: 5, isActive: true },
        ],
    })

    // ===========================================
    // ПОЛЬЗОВАТЕЛИ
    // ===========================================
    console.log('👤 Создание пользователей...')

    await prisma.user.createMany({
        data: [
            {
                email: 'admin@carwash.ru',
                passwordHash: '$2a$10$xV8YqK1h4fX5Z9Y2X5Z9Yu5Z9Y2X5Z9Y2X5Z9Y2X5Z9Y2X5Z9Y2X5',
                role: UserRole.ADMIN,
            },
            {
                email: 'operator@carwash.ru',
                passwordHash: '$2a$10$xV8YqK1h4fX5Z9Y2X5Z9Yu5Z9Y2X5Z9Y2X5Z9Y2X5Z9Y2X5Z9Y2X5',
                role: UserRole.OPERATOR,
            },
        ],
    })

    // ===========================================
    // КЛИЕНТЫ
    // ===========================================
    console.log('👥 Создание клиентов...')

    const clients = await prisma.client.createManyAndReturn({
        data: [
            { name: 'Иван Петров', phone: '+7 999 111-22-33', carNumber: 'А777АА', carBrand: 'Toyota', carModel: 'Camry', carColor: 'Чёрный' },
            { name: 'Сергей Сидоров', phone: '+7 999 222-33-44', carNumber: 'В555ОР', carBrand: 'BMW', carModel: 'X5', carColor: 'Белый' },
            { name: 'Николай Морозов', phone: '+7 918 222-33-44', carNumber: 'Н555НН', carBrand: 'Kia', carModel: 'Optima', carColor: 'Синий' },
            { name: 'Алексей Иванов', phone: '+7 999 123-45-67', carNumber: 'С333СК', carBrand: 'Hyundai', carModel: 'Solaris', carColor: 'Серебристый' },
            { name: 'Мария Козлова', phone: '+7 987 654-32-10', carNumber: 'К555КК', carBrand: 'Volkswagen', carModel: 'Polo', carColor: 'Белый' },
            { name: 'Дмитрий Смирнов', phone: '+7 912 345-67-89', carNumber: 'М777ММ', carBrand: 'Lada', carModel: 'Vesta', carColor: 'Красный' },
            { name: 'Елена Волкова', phone: '+7 905 111-22-33', carNumber: 'Е123ЕЕ', carBrand: 'Renault', carModel: 'Duster', carColor: 'Зелёный' },
            { name: 'Пётр Новиков', phone: '+7 917 333-44-55', carNumber: 'О777ОО', carBrand: 'Toyota', carModel: 'Corolla', carColor: 'Серый' },
            { name: 'Анна Соколова', phone: '+7 920 444-55-66', carNumber: 'А555АА', carBrand: 'Honda', carModel: 'Civic', carColor: 'Чёрный' },
            { name: 'Виктор Кузнецов', phone: '+7 921 555-66-77', carNumber: 'В888ВВ', carBrand: 'Nissan', carModel: 'Almera', carColor: 'Синий' },
        ],
    })

    // ===========================================
    // ЗАПИСИ ПО ВРЕМЕНИ
    // ===========================================
    console.log('📅 Создание записей...')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const box1 = await prisma.box.findUnique({ where: { number: 1 } })
    const box2 = await prisma.box.findUnique({ where: { number: 2 } })
    const box3 = await prisma.box.findUnique({ where: { number: 3 } })

    // Завершённая запись
    await prisma.appointment.create({
        data: {
            clientId: clients[2].id,
            startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000),
            duration: 30,
            status: AppointmentStatus.COMPLETED,
            services: 'Мойка кузова, коврики',
            price: 1200,
            isPaid: true,
            confirmedAt: new Date(today.getTime() + 14 * 60 * 60 * 1000),
            arrivalTime: new Date(today.getTime() + 14 * 60 * 60 * 1000),
            boxId: box1!.id,
        },
    })

    // Активная запись (в боксе)
    await prisma.appointment.create({
        data: {
            clientId: clients[0].id,
            startTime: new Date(today.getTime() + 14.5 * 60 * 60 * 1000),
            duration: 30,
            status: AppointmentStatus.COMPLETED,
            services: 'Комплексная мойка',
            price: 1200,
            isPaid: true,
            confirmedAt: new Date(today.getTime() + 14.5 * 60 * 60 * 1000),
            arrivalTime: new Date(today.getTime() + 14.5 * 60 * 60 * 1000),
            boxId: box1!.id,
        },
    })

    // Подтверждённая запись (ждёт)
    await prisma.appointment.create({
        data: {
            clientId: clients[3].id,
            startTime: new Date(today.getTime() + 15 * 60 * 60 * 1000),
            duration: 30,
            status: AppointmentStatus.CONFIRMED,
            services: 'Комплексная мойка + полировка',
            price: 2500,
            isPaid: false,
            confirmedAt: new Date(today.getTime() + 14.8 * 60 * 60 * 1000),
            arrivalTime: new Date(today.getTime() + 15 * 60 * 60 * 1000),
            boxId: box3!.id,
        },
    })

    // Ожидающие записи
    await prisma.appointment.createMany({
        data: [
            {
                clientId: clients[4].id,
                startTime: new Date(today.getTime() + 15.5 * 60 * 60 * 1000),
                duration: 30,
                status: AppointmentStatus.PENDING,
                services: 'Мойка кузова',
                price: 800,
                isPaid: true,
            },
            {
                clientId: clients[5].id,
                startTime: new Date(today.getTime() + 16 * 60 * 60 * 1000),
                duration: 30,
                status: AppointmentStatus.PENDING,
                services: 'Нано мойка, воск',
                price: 1800,
                isPaid: false,
            },
            {
                clientId: clients[6].id,
                startTime: new Date(today.getTime() + 16.5 * 60 * 60 * 1000),
                duration: 30,
                status: AppointmentStatus.PENDING,
                services: 'Мойка кузова, салона',
                price: 1500,
                isPaid: false,
            },
        ],
    })

    // ===========================================
    // ЖИВАЯ ОЧЕРЕДЬ
    // ===========================================
    console.log('📋 Создание живой очереди...')

    // Клиент в боксе (из живой очереди)
    const live1 = await prisma.liveQueue.create({
        data: {
            clientId: clients[1].id,
            arrivalTime: new Date(today.getTime() + 14.75 * 60 * 60 * 1000),
            status: LiveQueueStatus.IN_PROGRESS,
            services: 'Мойка кузова',
            price: 1500,
            isPaid: false,
            invitedAt: new Date(today.getTime() + 14.75 * 60 * 60 * 1000),
            position: 1,
            boxId: box2!.id,
        },
    })

    // Клиенты в очереди
    await prisma.liveQueue.createMany({
        data: [
            {
                clientId: clients[7].id,
                arrivalTime: new Date(today.getTime() + 14.33 * 60 * 60 * 1000),
                status: LiveQueueStatus.WAITING,
                services: 'Экспресс мойка',
                price: 500,
                isPaid: true,
                position: 1,
            },
            {
                clientId: clients[8].id,
                arrivalTime: new Date(today.getTime() + 14.58 * 60 * 60 * 1000),
                status: LiveQueueStatus.WAITING,
                services: 'Мойка кузова, керамика',
                price: 3000,
                isPaid: false,
                position: 2,
            },
            {
                clientId: clients[9].id,
                arrivalTime: new Date(today.getTime() + 14.83 * 60 * 60 * 1000),
                status: LiveQueueStatus.WAITING,
                services: 'Мойка кузова',
                price: 700,
                isPaid: false,
                position: 3,
            },
        ],
    })

    // ===========================================
    // СЕССИИ МОЙКИ
    // ===========================================
    console.log('🚿 Создание сессий мойки...')

    const appointment1 = await prisma.appointment.findFirst({ where: { clientId: clients[0].id } })

    // Активная сессия (Иван Петров - запись)
    await prisma.washSession.create({
        data: {
            boxId: box1!.id,
            clientId: clients[0].id,
            appointmentId: appointment1?.id,
            startTime: new Date(today.getTime() + 14.5 * 60 * 60 * 1000),
            duration: 30,
            status: WashStatus.IN_PROGRESS,
            isWashed: false,
        },
    })

    // Активная сессия (Сергей Сидоров - живая очередь)
    await prisma.washSession.create({
        data: {
            boxId: box2!.id,
            clientId: clients[1].id,
            liveQueueId: live1.id,
            startTime: new Date(today.getTime() + 14.75 * 60 * 60 * 1000),
            duration: 30,
            status: WashStatus.IN_PROGRESS,
            isWashed: false,
        },
    })

    // ===========================================
    // ЖУРНАЛ СОБЫТИЙ
    // ===========================================
    console.log('📜 Создание журнала событий...')

    const admin = await prisma.user.findUnique({ where: { email: 'admin@carwash.ru' } })

    await prisma.eventLog.createMany({
        data: [
            {
                type: 'CLIENT_CREATED',
                description: 'Создан новый клиент',
                userId: admin?.id,
                relatedType: 'Client',
                relatedId: clients[0].id,
            },
            {
                type: 'APPOINTMENT_CREATED',
                description: 'Создана новая запись',
                userId: admin?.id,
                relatedType: 'Appointment',
                relatedId: (await prisma.appointment.findFirst())?.id,
            },
            {
                type: 'WASH_STARTED',
                description: 'Начата мойка автомобиля',
                userId: admin?.id,
                relatedType: 'WashSession',
                relatedId: (await prisma.washSession.findFirst())?.id,
            },
        ],
    })

    // ===========================================
    // ИТОГИ
    // ===========================================
    console.log('\n📊 Итоги заполнения:')
    console.log('   - Боксы:', await prisma.box.count())
    console.log('   - Пользователи:', await prisma.user.count())
    console.log('   - Клиенты:', await prisma.client.count())
    console.log('   - Записи:', await prisma.appointment.count())
    console.log('   - Живая очередь:', await prisma.liveQueue.count())
    console.log('   - Сессии мойки:', await prisma.washSession.count())
    console.log('   - Настройки:', await prisma.setting.count())
    console.log('   - События:', await prisma.eventLog.count())

    console.log('\n✅ Заполнение завершено!')

    await prisma.$disconnect()
}

main().catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
})