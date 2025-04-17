// Thay YOUR_MAPBOX_TOKEN bằng token của bạn
mapboxgl.accessToken = 'pk.eyJ1IjoibHVwaW4xODMiLCJhIjoiY205aTdiNjlrMGRxOTJscTQ4YjkwaGc1bSJ9.deQZPZn76g_U3tux_qf1rg';

// Các ngôn ngữ được hỗ trợ
const languages = {
    vi: {
        currentLocation: 'Vị trí của bạn',
        clickLocation: 'Vị trí đã chọn',
        startPoint: 'Chọn điểm bắt đầu',
        endPoint: 'Chọn điểm kết thúc',
        clearRoute: 'Xóa đường đi'
    },
    en: {
        currentLocation: 'Your location',
        clickLocation: 'Selected location',
        startPoint: 'Select start point',
        endPoint: 'Select end point',
        clearRoute: 'Clear route'
    },
    zh: {
        currentLocation: '您的位置',
        clickLocation: '选定位置',
        startPoint: '选择起点',
        endPoint: '选择终点',
        clearRoute: '清除路线'
    }
};

let currentLang = 'vi';
let currentText = languages[currentLang];

// Khởi tạo map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [0, 0],
    zoom: 15
});

// Thêm controls
map.addControl(new mapboxgl.NavigationControl(), 'top-left');
map.addControl(new mapboxgl.FullscreenControl(), 'top-left');
map.addControl(new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
    },
    trackUserLocation: true,
    showUserHeading: true
}), 'top-left');

// Biến cho routing
let startMarker = null;
let endMarker = null;
let isSelectingStart = false;
let isSelectingEnd = false;
let routeLine = null;

// Xử lý ngôn ngữ
document.getElementById('language-select').addEventListener('change', function (e) {
    currentLang = e.target.value;
    currentText = languages[currentLang];
    updateUIText();
});

// Xử lý click trên bản đồ
map.on('click', function (e) {
    const coordinates = e.lngLat;

    if (isSelectingStart) {
        if (startMarker) startMarker.remove();
        startMarker = new mapboxgl.Marker({ color: '#33C9EB' })
            .setLngLat(coordinates)
            .addTo(map);
        isSelectingStart = false;
        document.getElementById('start-point').classList.remove('active');
    } else if (isSelectingEnd) {
        if (endMarker) endMarker.remove();
        endMarker = new mapboxgl.Marker({ color: '#FF6B6B' })
            .setLngLat(coordinates)
            .addTo(map);
        isSelectingEnd = false;
        document.getElementById('end-point').classList.remove('active');
    } else {
        // Thêm marker thường
        new mapboxgl.Marker()
            .setLngLat(coordinates)
            .setPopup(new mapboxgl.Popup().setHTML(currentText.clickLocation))
            .addTo(map)
            .togglePopup();
    }

    // Nếu có cả điểm đầu và điểm cuối, tạo route
    if (startMarker && endMarker) {
        getRoute();
    }
});

// Xử lý routing
document.getElementById('start-point').addEventListener('click', function () {
    isSelectingStart = true;
    isSelectingEnd = false;
    this.classList.add('active');
    document.getElementById('end-point').classList.remove('active');
});

document.getElementById('end-point').addEventListener('click', function () {
    isSelectingEnd = true;
    isSelectingStart = false;
    this.classList.add('active');
    document.getElementById('start-point').classList.remove('active');
});

document.getElementById('clear-route').addEventListener('click', function () {
    if (startMarker) {
        startMarker.remove();
        startMarker = null;
    }
    if (endMarker) {
        endMarker.remove();
        endMarker = null;
    }
    if (routeLine) {
        map.removeLayer('route');
        map.removeSource('route');
        routeLine = null;
    }
});

async function getRoute() {
    const start = startMarker.getLngLat();
    const end = endMarker.getLngLat();

    try {
        const query = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
        );
        const json = await query.json();
        const data = json.routes[0];
        const route = data.geometry.coordinates;

        if (routeLine) {
            map.removeLayer('route');
            map.removeSource('route');
        }

        // Thêm route vào map
        map.addSource('route', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': route
                }
            }
        });

        map.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#3887be',
                'line-width': 5,
                'line-opacity': 0.75
            }
        });

        routeLine = true;

        // Fit map to show the whole route
        const bounds = new mapboxgl.LngLatBounds();
        route.forEach(point => bounds.extend(point));
        map.fitBounds(bounds, {
            padding: 50
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateUIText() {
    document.getElementById('start-point').textContent = currentText.startPoint;
    document.getElementById('end-point').textContent = currentText.endPoint;
    document.getElementById('clear-route').textContent = currentText.clearRoute;
}

// Lấy vị trí hiện tại khi tải trang
if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(position => {
        const { longitude, latitude } = position.coords;
        map.flyTo({
            center: [longitude, latitude],
            essential: true
        });
    });
} 