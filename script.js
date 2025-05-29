async function fetchDashboardData() {
    try {
        const res = await fetch('http://localhost:3000/reportes/dashboard');
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error al obtener datos:', error);
        return null;
    }
}

function createBarChart(ctx, labels, data, label) {
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label,
                data,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    const dashboardData = await fetchDashboardData();
    if (!dashboardData) {
        document.body.insertAdjacentHTML('beforeend', '<p>Error cargando los datos.</p>');
        return;
    }

    // Podio de jugadores (puntaje)
    const podioCtx = document.getElementById('podioChart').getContext('2d');
    createBarChart(
        podioCtx,
        dashboardData.jugadoresPodio.map(j => j.nombre),
        dashboardData.jugadoresPodio.map(j => j.puntaje),
        'Puntaje'
    );

    // Partidas ganadas
    const ganadasCtx = document.getElementById('ganadasChart').getContext('2d');
    createBarChart(
        ganadasCtx,
        dashboardData.partidasGanadas.map(j => j.nombre),
        dashboardData.partidasGanadas.map(j => j.ganadas),
        'Partidas Ganadas'
    );

    // Eventos más frecuentes
    const eventosCtx = document.getElementById('eventosChart').getContext('2d');
    createBarChart(
        eventosCtx,
        dashboardData.eventosFrecuentes.map(e => e.accion),
        dashboardData.eventosFrecuentes.map(e => e.cantidad),
        'Cantidad de Eventos'
    );

    // Promedio de partidas por mes
    const promedioCtx = document.getElementById('promedioChart').getContext('2d');
    createBarChart(
        promedioCtx,
        dashboardData.promedioPartidasPorMes.map(p => p.mes),
        dashboardData.promedioPartidasPorMes.map(p => p.promedio),
        'Promedio de Partidas'
    );
});
