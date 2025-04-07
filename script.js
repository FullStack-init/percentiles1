document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const metricButtons = document.querySelectorAll('.metric-btn');
    const genderSelect = document.getElementById('gender-select');
    const chartCanvas = document.getElementById('growthChart');
    const childDataBody = document.getElementById('child-data-body');
    const referenceDataBody = document.getElementById('reference-data-body');
    const addMeasurementBtn = document.getElementById('add-measurement-btn');
    const childNameInput = document.getElementById('child-name');
    const childBirthdateInput = document.getElementById('child-birthdate');
    
    // Variables de estado
    let currentMetric = 'height';
    let currentGender = 'boy';
    let growthChart = null;
    
    // Datos del niño (inicialmente los de ejemplo)
    let childData = JSON.parse(JSON.stringify(boyExampleData));
    
    // Inicializar la aplicación
    init();
    
    function init() {
        setupEventListeners();
        updateChildDataTable();
        updateReferenceDataTable();
        renderChart();
    }
    
    function setupEventListeners() {
        // Botones de métrica
        metricButtons.forEach(button => {
            button.addEventListener('click', function() {
                metricButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                currentMetric = this.dataset.metric;
                updateChildDataTable();
                updateReferenceDataTable();
                renderChart();
            });
        });
        
        // Selector de género
        genderSelect.addEventListener('change', function() {
            currentGender = this.value;
            // Actualmente solo implementado para niños
            if (currentGender === 'girl') {
                alert('Los datos para niñas estarán disponibles próximamente');
                this.value = 'boy';
                currentGender = 'boy';
                return;
            }
            updateReferenceDataTable();
            renderChart();
        });
        
        // Botón para añadir medición
        addMeasurementBtn.addEventListener('click', addNewMeasurement);
        
        // Actualizar datos cuando cambia el nombre o fecha de nacimiento
        childNameInput.addEventListener('change', updateChartTitle);
        childBirthdateInput.addEventListener('change', function() {
            updateChildDataTable();
            updateChartTitle();
        });
    }
    
    function updateChildDataTable() {
        childDataBody.innerHTML = '';
        
        const metricData = childData[currentMetric];
        
        metricData.forEach((measurement, index) => {
            const row = document.createElement('tr');
            
            // Calcular edad en meses basada en la fecha de nacimiento y fecha de medición
            const birthDate = new Date(childBirthdateInput.value);
            const measureDate = new Date(measurement.date);
            const ageInMonths = calculateAgeInMonths(birthDate, measureDate);
            
            // Determinar el percentil
            const percentile = calculatePercentile(ageInMonths, measurement.value);
            
            row.innerHTML = `
                <td>${ageInMonths}</td>
                <td><input type="date" value="${measurement.date}" class="measure-date"></td>
                <td><input type="number" step="0.1" value="${measurement.value}" class="measure-value"></td>
                <td>${percentile}</td>
                <td><button class="delete-btn" data-index="${index}">Eliminar</button></td>
            `;
            
            childDataBody.appendChild(row);
        });
        
        // Agregar event listeners a los inputs y botones de eliminar
        document.querySelectorAll('.measure-date').forEach(input => {
            input.addEventListener('change', handleDataEdit);
        });
        
        document.querySelectorAll('.measure-value').forEach(input => {
            input.addEventListener('change', handleDataEdit);
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleDeleteMeasurement);
        });
    }
    
    function calculateAgeInMonths(birthDate, measureDate) {
        const yearsDiff = measureDate.getFullYear() - birthDate.getFullYear();
        const monthsDiff = measureDate.getMonth() - birthDate.getMonth();
        const totalMonths = yearsDiff * 12 + monthsDiff;
        
        // Ajustar si el día de la medida es anterior al día de nacimiento
        if (measureDate.getDate() < birthDate.getDate()) {
            return totalMonths - 1;
        }
        return totalMonths;
    }
    
    function updateReferenceDataTable() {
        referenceDataBody.innerHTML = '';
        
        const referenceData = boyReferenceData[currentMetric];
        const isHeadCircumference = currentMetric === 'head';
        const increment = isHeadCircumference ? 3 : 1;
        const maxAge = 24;
        
        for (let age = 0; age <= maxAge; age += increment) {
            const row = document.createElement('tr');
            const p3 = referenceData.p3[age];
            const p50 = referenceData.p50[age];
            const p97 = referenceData.p97[age];
            
            if (p3 !== undefined && p50 !== undefined && p97 !== undefined) {
                row.innerHTML = `
                    <td>${age}</td>
                    <td>${p3.toFixed(isHeadCircumference ? 1 : 2)}</td>
                    <td>${p50.toFixed(isHeadCircumference ? 1 : 2)}</td>
                    <td>${p97.toFixed(isHeadCircumference ? 1 : 2)}</td>
                `;
                referenceDataBody.appendChild(row);
            }
        }
    }
    
    function renderChart() {
        const ctx = chartCanvas.getContext('2d');
        const referenceData = boyReferenceData[currentMetric];
        const childMeasurements = childData[currentMetric];
        
        // Preparar datos para el gráfico
        const labels = [];
        const p3Data = [];
        const p50Data = [];
        const p97Data = [];
        const childDataPoints = [];
        
        // Obtener todas las edades únicas para las que tenemos datos
        const allAges = new Set();
        
        // Agregar edades de los datos de referencia
        Object.keys(referenceData.p3).forEach(age => {
            allAges.add(parseInt(age));
        });
        
        // Agregar edades de los datos del niño
        const birthDate = new Date(childBirthdateInput.value);
        childMeasurements.forEach(measurement => {
            const measureDate = new Date(measurement.date);
            const ageInMonths = calculateAgeInMonths(birthDate, measureDate);
            allAges.add(ageInMonths);
        });
        
        // Ordenar las edades
        const sortedAges = Array.from(allAges).sort((a, b) => a - b);
        
        // Preparar los datos para cada edad
        sortedAges.forEach(age => {
            labels.push(age);
            
            // Datos de referencia
            p3Data.push(referenceData.p3[age] || null);
            p50Data.push(referenceData.p50[age] || null);
            p97Data.push(referenceData.p97[age] || null);
            
            // Datos del niño - encontrar la medición más cercana a esta edad
            let childValue = null;
            childMeasurements.forEach(measurement => {
                const measureDate = new Date(measurement.date);
                const measureAge = calculateAgeInMonths(birthDate, measureDate);
                
                if (measureAge === age) {
                    childValue = measurement.value;
                }
            });
            
            childDataPoints.push(childValue);
        });
        
        // Destruir el gráfico anterior si existe
        if (growthChart) {
            growthChart.destroy();
        }
        
        // Configuración del gráfico
        const chartConfig = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Percentil 3',
                        data: p3Data,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderWidth: 1,
                        fill: false,
                        pointRadius: 0,
                        borderDash: [5, 5]
                    },
                    {
                        label: 'Percentil 50',
                        data: p50Data,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderWidth: 1,
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: 'Percentil 97',
                        data: p97Data,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderWidth: 1,
                        fill: false,
                        pointRadius: 0,
                        borderDash: [5, 5]
                    },
                    {
                        label: childNameInput.value || 'Niño',
                        data: childDataPoints,
                        borderColor: 'rgba(153, 102, 255, 1)',
                        backgroundColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 3,
                        fill: false,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: getMetricUnit()
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Edad (meses)'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: getChartTitle(),
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(2) + ' ' + getMetricUnit();
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        };
        
        // Crear el nuevo gráfico
        growthChart = new Chart(ctx, chartConfig);
    }
    
    function getMetricUnit() {
        switch(currentMetric) {
            case 'height': return 'cm';
            case 'weight': return 'kg';
            case 'head': return 'cm';
            default: return '';
        }
    }
    
    function getChartTitle() {
        let metricName = '';
        switch(currentMetric) {
            case 'height': metricName = 'Altura'; break;
            case 'weight': metricName = 'Peso'; break;
            case 'head': metricName = 'Perímetro Craneal'; break;
        }
        
        const childName = childNameInput.value || 'Niño';
        return `${metricName} de ${childName} comparado con percentiles de referencia`;
    }
    
    function updateChartTitle() {
        if (growthChart) {
            growthChart.options.plugins.title.text = getChartTitle();
            growthChart.update();
        }
    }
    
    function calculatePercentile(age, value) {
        const reference = boyReferenceData[currentMetric];
        const p3 = reference.p3[age];
        const p50 = reference.p50[age];
        const p97 = reference.p97[age];
        
        if (p3 === undefined || p50 === undefined || p97 === undefined) {
            return 'N/A';
        }
        
        if (value <= p3) return 'P3 o menor';
        if (value <= p50) return 'P3-P50';
        if (value <= p97) return 'P50-P97';
        return 'P97 o mayor';
    }
    
    function handleDataEdit(e) {
        const row = e.target.closest('tr');
        const rowIndex = Array.from(childDataBody.children).indexOf(row);
        
        if (rowIndex !== -1) {
            const dateInput = row.querySelector('.measure-date');
            const valueInput = row.querySelector('.measure-value');
            
            childData[currentMetric][rowIndex] = {
                date: dateInput.value,
                value: parseFloat(valueInput.value)
            };
            
            updateChildDataTable();
            renderChart();
        }
    }
    
    function handleDeleteMeasurement(e) {
        const index = parseInt(e.target.dataset.index);
        
        if (!isNaN(index) && index >= 0 && index < childData[currentMetric].length) {
            childData[currentMetric].splice(index, 1);
            updateChildDataTable();
            renderChart();
        }
    }
    
    function addNewMeasurement() {
        // Obtener la última fecha de medición o usar la fecha de nacimiento si no hay mediciones
        let lastDate = childBirthdateInput.value;
        if (childData[currentMetric].length > 0) {
            const lastMeasurement = childData[currentMetric][childData[currentMetric].length - 1];
            lastDate = lastMeasurement.date;
        }
        
        // Crear una nueva fecha un mes después de la última medición
        const newDate = new Date(lastDate);
        newDate.setMonth(newDate.getMonth() + 1);
        
        // Formatear la nueva fecha como YYYY-MM-DD
        const formattedDate = newDate.toISOString().split('T')[0];
        
        // Valor predeterminado basado en el percentil 50 para esa edad
        const birthDate = new Date(childBirthdateInput.value);
        const measureDate = new Date(formattedDate);
        const ageInMonths = calculateAgeInMonths(birthDate, measureDate);
        const defaultValue = boyReferenceData[currentMetric].p50[ageInMonths] || 0;
        
        // Agregar la nueva medición
        childData[currentMetric].push({
            date: formattedDate,
            value: parseFloat(defaultValue.toFixed(2))
        });
        
        updateChildDataTable();
        renderChart();
        
        // Desplazarse a la nueva fila
        const newRow = childDataBody.lastElementChild;
        newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Enfocar el campo de valor para facilitar la edición
        setTimeout(() => {
            const valueInput = newRow.querySelector('.measure-value');
            if (valueInput) valueInput.focus();
        }, 300);
    }
});