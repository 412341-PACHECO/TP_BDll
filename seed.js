const { MongoClient } = require("mongodb");

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

const nombres = ["Juan", "Ana", "Carlos", "Lucía", "María", "Jorge", "Sofía", "Miguel", "Valentina", "Diego"];
const apellidos = ["Pérez", "Gómez", "Ruiz", "Torres", "López", "Martínez", "Sánchez", "Ramírez", "Vargas", "Flores"];
const estadosPartida = ["activa", "finalizada", "cancelada"];
const acciones = ["apostar", "subir", "bajar", "pasar", "abandono", "ganar", "perder"];
const años = [2021, 2022, 2023, 2024];

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(year) {
    const month = Math.floor(Math.random() * 12);
    const day = Math.floor(Math.random() * 28) + 1; // Para evitar problemas con días
    return new Date(year, month, day, Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
}

async function run() {
    try {
        await client.connect();
        const db = client.db("juego_online_real");

        // Limpio colecciones
        await db.collection("jugadores").deleteMany({});
        await db.collection("partidas").deleteMany({});
        await db.collection("eventos").deleteMany({});
        await db.collection("reportes").deleteMany({});

        // 1. Crear 100 jugadores con puntajes entre 500 y 2000
        const jugadores = [];
        for (let i = 1; i <= 100; i++) {
            const nombreCompleto = `${randomElement(nombres)} ${randomElement(apellidos)}`;
            jugadores.push({
                id: `j${i}`,
                nombre: nombreCompleto,
                puntaje: Math.floor(Math.random() * 1500) + 500
            });
        }
        await db.collection("jugadores").insertMany(jugadores);

        // 2. Crear 200 partidas con estados aleatorios y jugadores random (2 a 5 jugadores)
        const partidas = [];
        for (let i = 1; i <= 200; i++) {
            const estado = randomElement(estadosPartida);
            const cantidadJugadores = Math.floor(Math.random() * 4) + 2;
            // Elegir jugadores aleatorios sin repetir en la misma partida
            const jugadoresEnPartida = [];
            while (jugadoresEnPartida.length < cantidadJugadores) {
                const candidato = jugadores[Math.floor(Math.random() * jugadores.length)];
                if (!jugadoresEnPartida.find(j => j.id === candidato.id)) {
                    // Definir estado del jugador según estado general de la partida
                    let estadoJugador = "jugando";
                    if (estado === "finalizada") {
                        // Uno es ganador, otros pueden estar perdedores o abandonado
                        if (jugadoresEnPartida.length === 0) estadoJugador = "ganador";
                        else {
                            const opciones = ["perdedor", "abandonado"];
                            estadoJugador = randomElement(opciones);
                        }
                    } else if (estado === "cancelada") {
                        estadoJugador = "cancelado";
                    }
                    jugadoresEnPartida.push({ id: candidato.id, estado: estadoJugador });
                }
            }
            // Fecha de la partida
            const year = randomElement(años);
            const fecha = randomDate(year);

            partidas.push({
                id: `p${i}`,
                estado,
                fecha,
                jugadores: jugadoresEnPartida
            });
        }
        await db.collection("partidas").insertMany(partidas);

        // 3. Crear eventos para esas partidas, entre 1 y 10 eventos por partida
        const eventos = [];
        for (const partida of partidas) {
            const cantidadEventos = Math.floor(Math.random() * 10) + 1;
            for (let e = 0; e < cantidadEventos; e++) {
                const jugador = randomElement(partida.jugadores);
                eventos.push({
                    partidaId: partida.id,
                    jugador: jugador.id,
                    accion: randomElement(acciones),
                    timestamp: new Date(partida.fecha.getTime() + e * 60000) // cada evento un minuto después
                });
            }
        }
        await db.collection("eventos").insertMany(eventos);

        // 4. Generar reportes con análisis solicitados

        // a) Jugadores con más partidas ganadas
        const partidasGanadas = await db.collection("partidas").aggregate([
            { $unwind: "$jugadores" },
            { $match: { "jugadores.estado": "ganador" } },
            { $group: { _id: "$jugadores.id", ganadas: { $sum: 1 } } },
            { $lookup: { from: "jugadores", localField: "_id", foreignField: "id", as: "jugadorInfo" } },
            { $unwind: "$jugadorInfo" },
            { $project: { _id: 0, id: "$_id", nombre: "$jugadorInfo.nombre", ganadas: 1 } },
            { $sort: { ganadas: -1 } }
        ]).toArray();

        // b) Jugador con mayor puntaje
        const jugadorTop = await db.collection("jugadores").find().sort({ puntaje: -1 }).limit(1).toArray();

        // c) Evento o acción que más sucede
        const accionTop = await db.collection("eventos").aggregate([
            { $group: { _id: "$accion", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]).toArray();

        // d) Promedio de partidas por año y mes
        const partidasPorMes = await db.collection("partidas").aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$fecha" },
                        month: { $month: "$fecha" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: "$_id.year",
                    totalPartidas: { $sum: "$count" },
                    mesesConDatos: { $sum: 1 },
                    promedioMensual: { $avg: "$count" }
                }
            },
            {
                $project: {
                    _id: 0,
                    año: "$_id",
                    totalPartidas: 1,
                    mesesConDatos: 1,
                    promedioMensual: { $round: ["$promedioMensual", 2] }
                }
            },
            { $sort: { año: 1 } }
        ]).toArray();

        // e) Podio de jugadores (top 3 por puntaje)
        const podio = await db.collection("jugadores").find()
            .sort({ puntaje: -1 })
            .limit(3)
            .project({ _id: 0, id: 1, nombre: 1, puntaje: 1 })
            .toArray();

        // Insertar reporte con todos los datos
        await db.collection("reportes").insertOne({
            id: "reporte_completo",
            descripcion: "Reporte con análisis de jugadores y partidas.",
            datos: {
                partidasGanadas,
                jugadorTop: jugadorTop[0],
                accionMasFrecuente: accionTop[0],
                promedioPartidasPorAñoMes: partidasPorMes,
                podioJugadores: podio
            },
            fechaGeneracion: new Date()
        });

        console.log("✅ Datos y reporte generados correctamente.");
    } catch (error) {
        console.error("❌ Error generando datos:", error);
    } finally {
        await client.close();
    }
}

run();
