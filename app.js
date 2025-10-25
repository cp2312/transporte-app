// ============================================
// APP.JS - APLICACIÓN DE TRANSPORTE PÚBLICO
// ============================================

// Variables globales
let map = null;
let busMarkers = [];
let routePolylines = [];
let userBalance = 10000;
let tripHistory = [];
let currentBusData = null;
let selectedRechargeAmount = 0;

// ============================================
// INICIALIZACIÓN
// ============================================

// Inicializar la aplicación cuando cargue la página
function init() {
    updateBalance();
    loadHistory();
}

// ============================================
// NAVEGACIÓN ENTRE PANTALLAS
// ============================================

function showScreen(screenId) {
    // Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar la pantalla seleccionada
    document.getElementById(screenId).classList.add('active');
    
    // Inicializar el mapa si se abre la pantalla del mapa
    if (screenId === 'map-screen' && !map) {
        initMap();
    }
    
    // Actualizar historial si se abre esa pantalla
    if (screenId === 'history-screen') {
        displayHistory();
    }
}

// ============================================
// FUNCIONES DEL MAPA
// ============================================

// Inicializar el mapa de Leaflet
function initMap() {
    // Crear mapa centrado en Tunja, Boyacá
    map = L.map('map').setView([5.5401, -73.3678], 13);
    
    // Agregar capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Dibujar rutas y buses
    drawRoutes();
    drawBuses();
    
    // Iniciar simulación de movimiento
    startBusSimulation();
}

// Dibujar las rutas en el mapa
function drawRoutes() {
    routes.forEach(route => {
        const polyline = L.polyline(route.coordinates, {
            color: route.color,
            weight: 4,
            opacity: 0.7
        }).addTo(map);
        
        polyline.bindPopup(`<b>${route.name}</b><br>Tarifa: $${route.fare}`);
        
        routePolylines.push({ id: route.id, polyline });
    });
}

// Dibujar los buses en el mapa
function drawBuses() {
    buses.forEach(bus => {
        const route = routes.find(r => r.id === bus.routeId);
        
        // Crear marcador personalizado para el bus
        const marker = L.marker([bus.latitude, bus.longitude], {
            icon: L.divIcon({
                className: 'bus-marker',
                html: `<div style="background: ${route.color}; color: white; padding: 5px 10px; border-radius: 20px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${bus.number}</div>`,
                iconSize: [60, 30]
            })
        }).addTo(map);
        
        // Agregar popup con información del bus
        marker.bindPopup(`
            <div style="text-align: center;">
                <b>Bus ${bus.number}</b><br>
                ${route.name}<br>
                <span style="color: ${route.color}; font-weight: bold;">Tarifa: $${route.fare}</span>
            </div>
        `);
        
        busMarkers.push({ id: bus.id, marker, data: bus });
    });
    
    updateActiveBusesCount();
}

// Simular movimiento de buses en tiempo real
function startBusSimulation() {
    setInterval(() => {
        busMarkers.forEach(({ marker, data }) => {
            const route = routes.find(r => r.id === data.routeId);
            const currentPos = marker.getLatLng();
            
            // Generar movimiento aleatorio pequeño (simula GPS)
            const newLat = currentPos.lat + (Math.random() - 0.5) * 0.002;
            const newLng = currentPos.lng + (Math.random() - 0.5) * 0.002;
            
            // Actualizar posición del marcador
            marker.setLatLng([newLat, newLng]);
            
            // Actualizar datos del bus
            data.latitude = newLat;
            data.longitude = newLng;
        });
    }, 3000); // Actualizar cada 3 segundos
}

// Filtrar buses por ruta
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
    if (element) {
        element.textContent = count;
    }
}

// ============================================
// FUNCIONES DE ESCANEO QR
// ============================================

// Simular escaneo de código QR
function simulateScan(busId) {
    const bus = buses.find(b => b.id === busId);
    const route = routes.find(r => r.id === bus.routeId);
    
    // Guardar datos del bus seleccionado
    currentBusData = {
        busId: bus.id,
        busNumber: bus.number,
        routeName: route.name,
        fare: route.fare
    };
    
    // Llenar información en la pantalla de pago
    document.getElementById('payment-bus-number').textContent = bus.number;
    document.getElementById('payment-route').textContent = route.name;
    document.getElementById('payment-fare').textContent = `$${route.fare} COP`;
    document.getElementById('payment-balance').textContent = `$${userBalance.toLocaleString()}`;
    
    // Navegar a pantalla de pago
    showScreen('payment-screen');
}

// ============================================
// FUNCIONES DE PAGO
// ============================================

// Procesar el pago del viaje
function processPayment() {
    // Verificar si hay saldo suficiente
    if (userBalance >= currentBusData.fare) {
        // Descontar del saldo
        userBalance -= currentBusData.fare;
        
        // Crear registro del viaje
        const trip = {
            date: new Date().toLocaleString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            bus: currentBusData.busNumber,
            route: currentBusData.routeName,
            amount: currentBusData.fare
        };
        
        // Agregar al historial
        tripHistory.unshift(trip);
        
        // Guardar en localStorage
        saveHistory();
        
        // Actualizar saldo en pantalla
        updateBalance();
        
        // Mostrar mensaje de éxito
        showSuccessModal(
            '¡Pago Exitoso!', 
            `Has pagado $${currentBusData.fare.toLocaleString()} por tu viaje en el bus ${currentBusData.busNumber}`
        );
        
        // Volver a home después de 2 segundos
        setTimeout(() => {
            closeModal();
            showScreen('home-screen');
        }, 2000);
    } else {
        // Saldo insuficiente
        showSuccessModal(
            'Saldo Insuficiente', 
            'Por favor recarga tu saldo para continuar'
        );
    }
}

// ============================================
// FUNCIONES DE RECARGA
// ============================================

// Seleccionar monto de recarga
function selectAmount(amount) {
    selectedRechargeAmount = amount;
    
    // Resetear estilos de todos los botones
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = '#667eea';
    });
    
    // Resaltar botón seleccionado
    event.target.style.background = '#667eea';
    event.target.style.color = 'white';
}

// Procesar recarga de saldo
function rechargeBalance() {
    let amount = selectedRechargeAmount;
    
    // Verificar si hay monto personalizado
    const customAmount = document.getElementById('custom-amount').value;
    if (customAmount && parseInt(customAmount) > 0) {
        amount = parseInt(customAmount);
    }
    
    // Validar que haya un monto seleccionado
    if (amount > 0) {
        // Agregar saldo
        userBalance += amount;
        
        // Actualizar pantalla
        updateBalance();
        
        // Guardar en localStorage
        saveHistory();
        
        // Mostrar mensaje de éxito
        showSuccessModal(
            '¡Recarga Exitosa!', 
            `Se han agregado $${amount.toLocaleString()} a tu saldo`
        );
        
        // Limpiar campos
        document.getElementById('custom-amount').value = '';
        selectedRechargeAmount = 0;
        
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.style.background = 'white';
            btn.style.color = '#667eea';
        });
        
        // Volver a home después de 2 segundos
        setTimeout(() => {
            closeModal();
            showScreen('home-screen');
        }, 2000);
    } else {
        showSuccessModal('Error', 'Por favor selecciona un monto válido');
    }
}

// ============================================
// FUNCIONES DE SALDO E HISTORIAL
// ============================================

// Actualizar saldo en todas las pantallas
function updateBalance() {
    const balanceElement = document.getElementById('user-balance');
    if (balanceElement) {
        balanceElement.textContent = `$${userBalance.toLocaleString()} COP`;
    }
}

// Mostrar historial de viajes
function displayHistory() {
    const historyList = document.getElementById('history-list');
    
    // Si no hay viajes
    if (tripHistory.length === 0) {
        historyList.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 15px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                <span style="font-size: 4em;">🚌</span>
                <p style="margin-top: 20px; color: #666;">No hay viajes registrados aún</p>
                <p style="color: #999; font-size: 0.9em;">Escanea un código QR para realizar tu primer viaje</p>
            </div>
        `;
        return;
    }
    
    // Generar HTML para cada viaje
    historyList.innerHTML = tripHistory.map(trip => `
        <div class="history-item">
            <div class="history-info">
                <h4>Bus ${trip.bus} - ${trip.route}</h4>
                <p>${trip.date}</p>
            </div>
            <div class="history-amount">-$${trip.amount.toLocaleString()}</div>
        </div>
    `).join('');
}

// Guardar datos en localStorage
function saveHistory() {
    localStorage.setItem('tripHistory', JSON.stringify(tripHistory));
    localStorage.setItem('userBalance', userBalance.toString());
}

// Cargar datos desde localStorage
function loadHistory() {
    const savedHistory = localStorage.getItem('tripHistory');
    const savedBalance = localStorage.getItem('userBalance');
    
    if (savedHistory) {
        try {
            tripHistory = JSON.parse(savedHistory);
        } catch (e) {
            console.error('Error al cargar historial:', e);
            tripHistory = [];
        }
    }
    
    if (savedBalance) {
        userBalance = parseInt(savedBalance);
        updateBalance();
    }
}

// ============================================
// FUNCIONES DE MODAL
// ============================================

// Mostrar modal con mensaje
function showSuccessModal(title, message) {
    document.getElementById('success-title').textContent = title;
    document.getElementById('success-message').textContent = message;
    document.getElementById('success-modal').classList.add('active');
}

// Cerrar modal
function closeModal() {
    document.getElementById('success-modal').classList.remove('active');
}

// ============================================
// INICIAR APLICACIÓN
// ============================================

// Ejecutar cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', init);