const routes = [
    {
        id: 'ruta-1',
        name: 'Ruta 1 - Centro',
        color: '#000000',
        fare: 2500,
        // Coordenadas que siguen calles reales
        waypoints: [
            [5.5350, -73.3678],
            [5.5380, -73.3670],
            [5.5401, -73.3678],
            [5.5420, -73.3650],
            [5.5450, -73.3640],
            [5.5470, -73.3620]
        ]
    },
    {
        id: 'ruta-2',
        name: 'Ruta 2 - Norte',
        color: '#666666',
        fare: 2500,
        waypoints: [
            [5.5350, -73.3678],
            [5.5370, -73.3690],
            [5.5401, -73.3678],
            [5.5430, -73.3710],
            [5.5460, -73.3740],
            [5.5490, -73.3770]
        ]
    },
    {
        id: 'ruta-3',
        name: 'Ruta 3 - Sur',
        color: '#333333',
        fare: 2500,
        waypoints: [
            [5.5480, -73.3620],
            [5.5450, -73.3640],
            [5.5401, -73.3678],
            [5.5370, -73.3660],
            [5.5340, -73.3630],
            [5.5310, -73.3600]
        ]
    }
];

// Buses con posiciones iniciales
const buses = [
    { id: 'BUS-001', number: '101', routeId: 'ruta-1', latitude: 5.5380, longitude: -73.3670 },
    { id: 'BUS-002', number: '205', routeId: 'ruta-2', latitude: 5.5430, longitude: -73.3710 },
    { id: 'BUS-003', number: '308', routeId: 'ruta-3', latitude: 5.5370, longitude: -73.3660 },
    { id: 'BUS-004', number: '102', routeId: 'ruta-1', latitude: 5.5450, longitude: -73.3640 },
    { id: 'BUS-005', number: '206', routeId: 'ruta-2', latitude: 5.5460, longitude: -73.3740 }
];