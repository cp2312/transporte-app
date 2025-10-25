const routes = [
    {
        id: 'ruta-1',
        name: 'Ruta 1 - Centro',
        color: '#FF6B6B',
        fare: 2500,
        coordinates: [
            [5.5401, -73.3678],
            [5.5420, -73.3650],
            [5.5450, -73.3620],
            [5.5480, -73.3590],
            [5.5500, -73.3560]
        ]
    },
    {
        id: 'ruta-2',
        name: 'Ruta 2 - Norte',
        color: '#4ECDC4',
        fare: 2500,
        coordinates: [
            [5.5401, -73.3678],
            [5.5430, -73.3700],
            [5.5460, -73.3730],
            [5.5490, -73.3760],
            [5.5520, -73.3790]
        ]
    },
    {
        id: 'ruta-3',
        name: 'Ruta 3 - Sur',
        color: '#95E1D3',
        fare: 2500,
        coordinates: [
            [5.5401, -73.3678],
            [5.5370, -73.3650],
            [5.5340, -73.3620],
            [5.5310, -73.3590],
            [5.5280, -73.3560]
        ]
    }
];

// Datos simulados de buses
const buses = [
    { id: 'BUS-001', number: '101', routeId: 'ruta-1', latitude: 5.5420, longitude: -73.3650 },
    { id: 'BUS-002', number: '205', routeId: 'ruta-2', latitude: 5.5460, longitude: -73.3730 },
    { id: 'BUS-003', number: '308', routeId: 'ruta-3', latitude: 5.5340, longitude: -73.3620 },
    { id: 'BUS-004', number: '102', routeId: 'ruta-1', latitude: 5.5480, longitude: -73.3590 },
    { id: 'BUS-005', number: '206', routeId: 'ruta-2', latitude: 5.5490, longitude: -73.3760 }
];

// ============================================
// ARCHIVO: app.js
// ============================================
// Variables globales
let map = null;
let busMarkers = [];
let routePolylines = [];
let userBalance = 10000;
let tripHistory = [];
let currentBusData = null;

// Inicializar la aplicación
function init() {
    updateBalance();
    loadHistory();
}

// Cambiar entre pantallas
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    document.getElementById(screenId).classList.add('active');
    
    if (screenId === 'map-screen' && !map) {
        initMap();
    }
    
    if (screenId === 'history-screen') {
        displayHistory();
    }
}

// Inicializar mapa
function initMap() {
    map = L.map('map').setView([5.5401, -73.3678], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    drawRoutes();
    drawBuses();
    startBusSimulation();
}

// Dibujar rutas en el mapa
function drawRoutes() {
    routes.forEach(route => {
        const polyline = L.polyline(route.coordinates, {
            color: route.color,
            weight: 4
        }).addTo(map);
        
        routePolylines.push({ id: route.id, polyline });
    });
}

// Dibujar buses en el mapa
function drawBuses() {
    buses.forEach(bus => {
        const route = routes.find(r => r.id === bus.routeId);
        
        const marker = L.marker([bus.latitude, bus.longitude], {
            icon: L.divIcon({
                className: 'bus-marker',
                html: `<div style="background: ${route.color}; color: white; padding: 5px 10px; border-radius: 20px; font-weight: bold;">${bus.number}</div>`,
                iconSize: [60, 30]
            })
        }).addTo(map);
        
        marker.bindPopup(`
            <b>Bus ${bus.number}</b><br>
            ${route.name}<br>
            Tarifa: $${route.fare}
        `);
        
        busMarkers.push({ id: bus.id, marker, data: bus });
    });
    
    updateActiveBusesCount();
}

// Simular movimiento de buses
function startBusSimulation() {
    setInterval(() => {
        busMarkers.forEach(({ marker, data }) => {
            const route = routes.find(r => r.id === data.routeId);
            const currentPos = marker.getLatLng();
            
            // Movimiento aleatorio pequeño
            const newLat = currentPos.lat + (Math.random() - 0.5) * 0.002;
            const newLng = currentPos.lng + (Math.random() - 0.5) * 0.002;
            
            marker.setLatLng([newLat, newLng]);
            data.latitude = newLat;
            data.longitude = newLng;
        });
    }, 3000);
}

// Filtrar rutas
function filterRoute() {
    const selectedRoute = document.getElementById('route-filter').value;
    
    busMarkers.forEach(({ marker, data }) => {
        if (selectedRoute === 'all' || data.routeId === selectedRoute) {
            marker.addTo(map);
        } else {
            marker.remove();
        }
    });
    
    updateActiveBusesCount();
}

// Actualizar contador de buses activos
function updateActiveBusesCount() {
    const selectedRoute = document.getElementById('route-filter')?.value || 'all';
    let count = buses.length;
    
    if (selectedRoute !== 'all') {
        count = buses.filter(b => b.routeId === selectedRoute).length;
    }
    
    const element = document.getElementById('active-buses');
    if (element) element.textContent = count;
}

// Simular escaneo de QR
function simulateScan(busId) {
    const bus = buses.find(b => b.id === busId);
    const route = routes.find(r => r.id === bus.routeId);
    
    currentBusData = {
        busId: bus.id,
        busNumber: bus.number,
        routeName: route.name,
        fare: route.fare
    };
    
    document.getElementById('payment-bus-number').textContent = bus.number;
    document.getElementById('payment-route').textContent = route.name;
    document.getElementById('payment-fare').textContent = `$${route.fare} COP`;
    document.getElementById('payment-balance').textContent = `$${userBalance.toLocaleString()}`;
    
    showScreen('payment-screen');
}

// Procesar pago
function processPayment() {
    if (userBalance >= currentBusData.fare) {
        userBalance -= currentBusData.fare;
        
        const trip = {
            date: new Date().toLocaleString('es-CO'),
            bus: currentBusData.busNumber,
            route: currentBusData.routeName,
            amount: currentBusData.fare
        };
        
        tripHistory.unshift(trip);
        saveHistory();
        updateBalance();
        
        showSuccessModal('¡Pago Exitoso!', `Has pagado $${currentBusData.fare} por tu viaje en el bus ${currentBusData.busNumber}`);
        
        setTimeout(() => {
            closeModal();
            showScreen('home-screen');
        }, 2000);
    } else {
        showSuccessModal('Saldo Insuficiente', 'Por favor recarga tu saldo para continuar');
    }
}

// Seleccionar monto de recarga
let selectedRechargeAmount = 0;

function selectAmount(amount) {
    selectedRechargeAmount = amount;
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = '#667eea';
    });
    event.target.style.background = '#667eea';
    event.target.style.color = 'white';
}

// Recargar saldo
function rechargeBalance() {
    let amount = selectedRechargeAmount;
    
    const customAmount = document.getElementById('custom-amount').value;
    if (customAmount && parseInt(customAmount) > 0) {
        amount = parseInt(customAmount);
    }
    
    if (amount > 0) {
        userBalance += amount;
        updateBalance();
        
        showSuccessModal('¡Recarga Exitosa!', `Se han agregado $${amount.toLocaleString()} a tu saldo`);
        
        setTimeout(() => {
            closeModal();
            showScreen('home-screen');
        }, 2000);
    } else {
        showSuccessModal('Error', 'Por favor selecciona un monto válido');
    }
}

// Actualizar saldo en pantalla
function updateBalance() {
    document.getElementById('user-balance').textContent = `$${userBalance.toLocaleString()} COP`;
}

// Mostrar historial
function displayHistory() {
    const historyList = document.getElementById('history-list');
    
    if (tripHistory.length === 0) {
        historyList.innerHTML = '<div style="background: white; padding: 40px; border-radius: 15px; text-align: center;"><p>No hay viajes registrados aún</p></div>';
        return;
    }
    
    historyList.innerHTML = tripHistory.map(trip => `
        <div class="history-item">
            <div class="history-info">
                <h4>Bus ${trip.bus} - ${trip.route}</h4>
                <p>${trip.date}</p>
            </div>
            <div class="history-amount">-${trip.amount.toLocaleString()}</div>
        </div>
    `).join('');
}

// Guardar historial en localStorage
function saveHistory() {
    localStorage.setItem('tripHistory', JSON.stringify(tripHistory));
    localStorage.setItem('userBalance', userBalance.toString());
}

// Cargar historial desde localStorage
function loadHistory() {
    const savedHistory = localStorage.getItem('tripHistory');
    const savedBalance = localStorage.getItem('userBalance');
    
    if (savedHistory) {
        tripHistory = JSON.parse(savedHistory);
    }
    
    if (savedBalance) {
        userBalance = parseInt(savedBalance);
        updateBalance();
    }
}

// Mostrar modal de éxito
function showSuccessModal(title, message) {
    document.getElementById('success-title').textContent = title;
    document.getElementById('success-message').textContent = message;
    document.getElementById('success-modal').classList.add('active');
}

// Cerrar modal
function closeModal() {
    document.getElementById('success-modal').classList.remove('active');
}

// Iniciar aplicación cuando cargue la página
window.addEventListener('DOMContentLoaded', init);