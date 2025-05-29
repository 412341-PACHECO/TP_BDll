const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');

app.use(cors());

// Simulación de datos ya procesados para los gráficos
const dashboardData = {
    jugadoresPodio: [
        { nombre: "Ana", puntaje: 1500 },
        { nombre: "Juan", puntaje: 1400 },
        { nombre: "Lucia", puntaje: 1300 }
    ],
    partidasGanadas: [
        { nombre: "Ana", ganadas: 20 },
        { nombre: "Juan", ganadas: 18 },
        { nombre: "Lucia", ganadas: 15 }
    ],
    eventosFrecuentes: [
        { accion: "apostar", cantidad: 50 },
        { accion: "abandono", cantidad: 10 },
        { accion: "subir", cantidad: 30 }
    ],
    promedioPartidasPorMes: [
        { mes: "2025-01", promedio: 5 },
        { mes: "2025-02", promedio: 7 }
    ]
};

// Endpoint que devuelve los datos para el dashboard
app.get('/reportes/dashboard', (req, res) => {
    res.json(dashboardData);
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
