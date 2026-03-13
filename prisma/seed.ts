// prisma/seed.ts
import 'dotenv/config'
import { PrismaClient, QueueEntrySource, QueueEntryStatus, WashStatus, UserRole } from '@prisma/client'
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
        ssl: { rejectUnauthorized: false }
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
        prisma.notification.deleteMany(),
        prisma.washSession.deleteMany(),
        prisma.queueEntry.deleteMany(),
        prisma.eventLog.deleteMany(),
        prisma.systemConfig.deleteMany(),
        prisma.user.deleteMany(),
        prisma.client.deleteMany(),
        prisma.box.deleteMany(),
    ])
    console.log('✅ База данных очищена\n')

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
    const boxes = await prisma.box.findMany({ orderBy: { number: 'asc' } })

    // ===========================================
    // ПОЛЬЗОВАТЕЛИ
    // ===========================================
    console.log('👤 Создание пользователей...')
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@carwash.ru',
            passwordHash: '$2a$10$xV8YqK1h4fX5Z9Y2X5Z9Yu5Z9Y2X5Z9Y2X5Z9Y2X5Z9Y2X5Z9Y2X5',
            name: 'Администратор',
            role: UserRole.ADMIN,
        },
    })

    await prisma.user.create({
        data: {
            email: 'operator@carwash.ru',
            passwordHash: '$2a$10$xV8YqK1h4fX5Z9Y2X5Z9Yu5Z9Y2X5Z9Y2X5Z9Y2X5Z9Y2X5Z9Y2X5',
            name: 'Оператор',
            role: UserRole.OPERATOR,
        },
    })

    // ===========================================
    // КОНФИГУРАЦИЯ СИСТЕМЫ
    // ===========================================
    console.log('⚙️  Создание конфигурации...')
    await prisma.systemConfig.create({
        data: {
            effectiveFrom: new Date(),
            activeBoxesCount: 5,
            defaultDurationMin: 30,
            slotStepMin: 5,
            liveQueueMaxWaitMin: 120,
            noShowGraceMin: 15,
            reminderBeforeMin: 30,
            workStartHour: 8,
            workEndHour: 22,
            createdById: adminUser.id,
        },
    })

    // ===========================================
    // КЛИЕНТЫ
    // ===========================================
    console.log('👥 Создание клиентов...')

    const clients = await Promise.all([
        prisma.client.create({
            data: { name: 'Иван Петров', phone: '+7 999 111-22-33', carNumber: 'А777АА', carBrand: 'Toyota', carModel: 'Camry', carColor: 'Чёрный' },
        }),
        prisma.client.create({
            data: { name: 'Сергей Сидоров', phone: '+7 999 222-33-44', carNumber: 'В555ОР', carBrand: 'BMW', carModel: 'X5', carColor: 'Белый' },
        }),
        prisma.client.create({
            data: { name: 'Николай Морозов', phone: '+7 918 222-33-44', carNumber: 'Н555НН', carBrand: 'Kia', carModel: 'Optima', carColor: 'Синий' },
        }),
        prisma.client.create({
            data: { name: 'Алексей Иванов', phone: '+7 999 123-45-67', carNumber: 'С333СК', carBrand: 'Hyundai', carModel: 'Solaris', carColor: 'Серебристый' },
        }),
        prisma.client.create({
            data: { name: 'Мария Козлова', phone: '+7 987 654-32-10', carNumber: 'К555КК', carBrand: 'Volkswagen', carModel: 'Polo', carColor: 'Белый' },
        }),
        prisma.client.create({
            data: { name: 'Дмитрий Смирнов', phone: '+7 912 345-67-89', carNumber: 'М777ММ', carBrand: 'Lada', carModel: 'Vesta', carColor: 'Красный' },
        }),
        prisma.client.create({
            data: { name: 'Елена Волкова', phone: '+7 905 111-22-33', carNumber: 'Е123ЕЕ', carBrand: 'Renault', carModel: 'Duster', carColor: 'Зелёный' },
        }),
        prisma.client.create({
            data: { name: 'Пётр Новиков', phone: '+7 917 333-44-55', carNumber: 'О777ОО', carBrand: 'Toyota', carModel: 'Corolla', carColor: 'Серый' },
        }),
        prisma.client.create({
            data: { name: 'Анна Соколова', phone: '+7 920 444-55-66', carNumber: 'А555АА', carBrand: 'Honda', carModel: 'Civic', carColor: 'Чёрный' },
        }),
        prisma.client.create({
            data: { name: 'Виктор Кузнецов', phone: '+7 921 555-66-77', carNumber: 'В888ВВ', carBrand: 'Nissan', carModel: 'Almera', carColor: 'Синий' },
        }),
    ])

    // ===========================================
    // ЗАПИСИ В ЕДИНОЙ ОЧЕРЕДИ (QueueEntry)
    // ===========================================
    console.log('📅 Создание записей в очереди...')

    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    // --- Завершённые записи (SCHEDULED) ---
    // Запись 1: Николай Морозов - завершено сегодня в 10:00
    const entry1Start = new Date(today.getTime() + 10 * 60 * 60 * 1000) // 10:00
    await prisma.queueEntry.create({
        data: {
            clientId: clients[2].id,
            source: QueueEntrySource.SCHEDULED,
            status: QueueEntryStatus.COMPLETED,
            requestedStartAt: entry1Start,
            plannedStartAt: entry1Start,
            plannedEndAt: new Date(entry1Start.getTime() + 30 * 60000),
            estimatedDurationMin: 30,
            actualStartAt: entry1Start,
            actualEndAt: new Date(entry1Start.getTime() + 28 * 60000),
            actualDurationMin: 28,
            services: 'Мойка кузова, коврики',
            price: 1200,
            isPaid: true,
            boxId: boxes[0].id,
        },
    })

    // Запись 2: Иван Петров - в процессе мойки (IN_SERVICE)
    const entry2Start = new Date(now.getTime() - 15 * 60000) // началась 15 мин назад
    const entry2 = await prisma.queueEntry.create({
        data: {
            clientId: clients[0].id,
            source: QueueEntrySource.SCHEDULED,
            status: QueueEntryStatus.IN_SERVICE,
            requestedStartAt: entry2Start,
            plannedStartAt: entry2Start,
            plannedEndAt: new Date(entry2Start.getTime() + 30 * 60000),
            estimatedDurationMin: 30,
            actualStartAt: entry2Start,
            checkedInAt: new Date(entry2Start.getTime() - 5 * 60000),
            services: 'Комплексная мойка',
            price: 1500,
            isPaid: true,
            boxId: boxes[0].id,
        },
    })

    // --- Live очередь ---
    // Live 1: Сергей Сидоров - в процессе мойки
    const live1Start = new Date(now.getTime() - 10 * 60000)
    const live1 = await prisma.queueEntry.create({
        data: {
            clientId: clients[1].id,
            source: QueueEntrySource.LIVE,
            status: QueueEntryStatus.IN_SERVICE,
            priority: 0,
            requestedStartAt: new Date(now.getTime() - 25 * 60000), // пришёл 25 мин назад
            plannedStartAt: live1Start,
            plannedEndAt: new Date(live1Start.getTime() + 30 * 60000),
            estimatedDurationMin: 30,
            actualStartAt: live1Start,
            checkedInAt: new Date(live1Start.getTime() - 3 * 60000),
            services: 'Мойка кузова',
            price: 1000,
            isPaid: false,
            boxId: boxes[1].id,
        },
    })

    // Live 2: Пётр Новиков - следующий в очереди (CONFIRMED)
    // ETA будет рассчитан автоматически на основе текущей загрузки
    await prisma.queueEntry.create({
        data: {
            clientId: clients[7].id,
            source: QueueEntrySource.LIVE,
            status: QueueEntryStatus.CONFIRMED,
            priority: 0,
            requestedStartAt: new Date(now.getTime() - 10 * 60000), // пришёл 10 мин назад
            plannedStartAt: new Date(now.getTime() + 5 * 60000), // примерное время (будет скорректировано в UI)
            plannedEndAt: new Date(now.getTime() + 35 * 60000),
            estimatedDurationMin: 30,
            checkinDeadlineAt: new Date(now.getTime() + 20 * 60000),
            services: 'Экспресс мойка',
            price: 500,
            isPaid: true,
        },
    })

    // Live 3: Анна Соколова - в очереди (CREATED)
    await prisma.queueEntry.create({
        data: {
            clientId: clients[8].id,
            source: QueueEntrySource.LIVE,
            status: QueueEntryStatus.CREATED,
            priority: 0,
            requestedStartAt: new Date(now.getTime() - 5 * 60000), // пришёл 5 мин назад
            plannedStartAt: new Date(now.getTime() + 35 * 60000), // примерное время
            plannedEndAt: new Date(now.getTime() + 65 * 60000),
            estimatedDurationMin: 30,
            services: 'Мойка кузова, керамика',
            price: 3000,
            isPaid: false,
        },
    })

    // Live 4: Виктор Кузнецов - в очереди (CREATED)
    await prisma.queueEntry.create({
        data: {
            clientId: clients[9].id,
            source: QueueEntrySource.LIVE,
            status: QueueEntryStatus.CREATED,
            priority: 0,
            requestedStartAt: new Date(now.getTime() - 2 * 60000), // пришёл 2 мин назад
            plannedStartAt: new Date(now.getTime() + 65 * 60000), // примерное время
            plannedEndAt: new Date(now.getTime() + 95 * 60000),
            estimatedDurationMin: 30,
            services: 'Мойка кузова',
            price: 700,
            isPaid: false,
        },
    })

    // --- Предварительные записи (SCHEDULED) на сегодня ---
    // Запись 3: Алексей Иванов - подтверждённая запись на 15:00
    const entry3Start = new Date(today.getTime() + 15 * 60 * 60 * 1000) // 15:00
    await prisma.queueEntry.create({
        data: {
            clientId: clients[3].id,
            source: QueueEntrySource.SCHEDULED,
            status: QueueEntryStatus.CONFIRMED,
            requestedStartAt: entry3Start,
            plannedStartAt: entry3Start,
            plannedEndAt: new Date(entry3Start.getTime() + 30 * 60000),
            estimatedDurationMin: 30,
            checkinDeadlineAt: new Date(entry3Start.getTime() + 15 * 60000),
            services: 'Комплексная мойка + полировка',
            price: 2500,
            isPaid: false,
        },
    })

    // Запись 4: Мария Козлова - ожидает подтверждения на 15:30
    const entry4Start = new Date(today.getTime() + 15.5 * 60 * 60 * 1000) // 15:30
    await prisma.queueEntry.create({
        data: {
            clientId: clients[4].id,
            source: QueueEntrySource.SCHEDULED,
            status: QueueEntryStatus.CREATED,
            requestedStartAt: entry4Start,
            plannedStartAt: entry4Start,
            plannedEndAt: new Date(entry4Start.getTime() + 30 * 60000),
            estimatedDurationMin: 30,
            services: 'Мойка кузова',
            price: 800,
            isPaid: true,
        },
    })

    // Запись 5: Дмитрий Смирнов - на 16:00
    const entry5Start = new Date(today.getTime() + 16 * 60 * 60 * 1000) // 16:00
    await prisma.queueEntry.create({
        data: {
            clientId: clients[5].id,
            source: QueueEntrySource.SCHEDULED,
            status: QueueEntryStatus.CREATED,
            requestedStartAt: entry5Start,
            plannedStartAt: entry5Start,
            plannedEndAt: new Date(entry5Start.getTime() + 30 * 60000),
            estimatedDurationMin: 30,
            services: 'Нано мойка, воск',
            price: 1800,
            isPaid: false,
        },
    })

    // Запись 6: Елена Волкова - VIP клиент (priority = 1) на 16:30
    const entry6Start = new Date(today.getTime() + 16.5 * 60 * 60 * 1000) // 16:30
    await prisma.queueEntry.create({
        data: {
            clientId: clients[6].id,
            source: QueueEntrySource.SCHEDULED,
            status: QueueEntryStatus.CREATED,
            priority: 1, // VIP
            requestedStartAt: entry6Start,
            plannedStartAt: entry6Start,
            plannedEndAt: new Date(entry6Start.getTime() + 45 * 60000),
            estimatedDurationMin: 45,
            services: 'VIP мойка + полировка',
            price: 3500,
            isPaid: false,
            notes: 'Постоянный клиент, скидка 10%',
        },
    })

    // --- Запись от админа ---
    const adminEntryStart = new Date(today.getTime() + 17 * 60 * 60 * 1000) // 17:00
    await prisma.queueEntry.create({
        data: {
            clientId: clients[7].id,
            source: QueueEntrySource.ADMIN,
            status: QueueEntryStatus.CONFIRMED,
            requestedStartAt: adminEntryStart,
            plannedStartAt: adminEntryStart,
            plannedEndAt: new Date(adminEntryStart.getTime() + 30 * 60000),
            estimatedDurationMin: 30,
            checkinDeadlineAt: new Date(adminEntryStart.getTime() + 15 * 60000),
            services: 'Мойка кузова',
            price: 800,
            isPaid: false,
            notes: 'Записан по телефону',
        },
    })

    // ===========================================
    // СЕССИИ МОЙКИ
    // ===========================================
    console.log('🚿 Создание сессий мойки...')

    // Сессия 1: Иван Петров (IN_SERVICE)
    await prisma.washSession.create({
        data: {
            boxId: boxes[0].id,
            clientId: clients[0].id,
            queueEntryId: entry2.id,
            startTime: entry2.actualStartAt!,
            status: WashStatus.IN_PROGRESS,
            isWashed: false,
            isPaid: true,
        },
    })

    // Сессия 2: Сергей Сидоров (IN_SERVICE)
    await prisma.washSession.create({
        data: {
            boxId: boxes[1].id,
            clientId: clients[1].id,
            queueEntryId: live1.id,
            startTime: live1.actualStartAt!,
            status: WashStatus.IN_PROGRESS,
            isWashed: false,
            isPaid: false,
        },
    })

    // ===========================================
    // ЖУРНАЛ СОБЫТИЙ
    // ===========================================
    console.log('📜 Создание журнала событий...')
    await prisma.eventLog.createMany({
        data: [
            {
                type: 'CONFIG_CREATED',
                description: 'Создана конфигурация системы',
                userId: adminUser.id,
            },
            {
                type: 'QUEUE_ENTRY_CREATED',
                description: 'Создана запись в очереди',
                userId: adminUser.id,
                relatedType: 'QueueEntry',
            },
            {
                type: 'WASH_STARTED',
                description: 'Начата мойка автомобиля',
                userId: adminUser.id,
                relatedType: 'WashSession',
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
    console.log('   - Записи в очереди:', await prisma.queueEntry.count())
    console.log('     • Live:', await prisma.queueEntry.count({ where: { source: QueueEntrySource.LIVE } }))
    console.log('     • Scheduled:', await prisma.queueEntry.count({ where: { source: QueueEntrySource.SCHEDULED } }))
    console.log('     • Admin:', await prisma.queueEntry.count({ where: { source: QueueEntrySource.ADMIN } }))
    console.log('   - Сессии мойки:', await prisma.washSession.count())
    console.log('   - Конфигурации:', await prisma.systemConfig.count())
    console.log('   - События:', await prisma.eventLog.count())

    // Статистика по статусам
    const statusCounts = await prisma.queueEntry.groupBy({
        by: ['status'],
        _count: true,
    })
    console.log('\n   По статусам:')
    statusCounts.forEach((s) => {
        console.log(`     • ${s.status}: ${s._count}`)
    })

    console.log('\n✅ Заполнение завершено!')
    await prisma.$disconnect()
}

main().catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
})