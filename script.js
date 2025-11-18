// script.js

// ---- Simülasyon sınıfı (fizik tarafı) ----
class SolarTankSimulator {
    constructor(options) {
        this.Panel_area = options.Panel_area;
        this.Tank_Volume = options.Tank_Volume;
        this.Daily_avg_temp = options.Daily_avg_temp;
        this.Daily_sun_time_hours = options.Daily_sun_time_hours;
        this.days = options.days;
        this.basePanelEfficiency = options.basePanelEfficiency;
        this.Solar_peak = options.Solar_peak;
        this.baseTankHeatLoss = options.baseTankHeatLoss;

        // Sabitler
        this.Starting_tank_temp = 12.0;   // °C
        this.dt = 60.0;                   // saniye – 1 dakikalık adım
        this.densityWater = 1.0;          // 1 L = 1 kg
        this.heatCapacityWater = 4180.0;  // J/(kg·K)
    }

    run() {
        const massWaterTank = this.Tank_Volume * this.densityWater;
        const sim_time = Math.floor(this.days * 24 * 3600);
        const sunDuration = this.Daily_sun_time_hours * 3600;

        let TankTemp = this.Starting_tank_temp;
        let Pump_hours = 0.0;
        let t = 0.0;
        let day_index = 0;

        const timeHours = [];
        const temps = [];
        const dailyTemps = [];

        while (t <= sim_time) {
            const timeOfDay = t % 86400;
            let Heat_input_from_solar = 0.0;

            // Güneş var mı? Varsa sinüs şeklinde değişen ışınım
            if (timeOfDay < sunDuration) {
                const dayProgress = timeOfDay / sunDuration;           // 0–1
                let sunShape = Math.sin(Math.PI * dayProgress);       // 0 -> 1 -> 0
                if (sunShape < 0) {
                    sunShape = 0;
                }
                const currentIrradiance = this.Solar_peak * sunShape;

                // Panel verimi tank sıcaklığına bağlı
                let panelEfficiency = this.basePanelEfficiency - 0.002 * (TankTemp - 25.0);
                if (panelEfficiency < 0.5) {
                    panelEfficiency = 0.5;
                }
                if (panelEfficiency > 0.9) {
                    panelEfficiency = 0.9;
                }

                Heat_input_from_solar = this.Panel_area * currentIrradiance * panelEfficiency;
                Pump_hours += this.dt / 3600.0;
            }

            // Dinamik ısı kaybı
            const tempDifference = TankTemp - this.Daily_avg_temp;
            let tankHeatLoss = this.baseTankHeatLoss;

            if (tempDifference > 0) {
                const factor = Math.min(0.5, (tempDifference / 40.0) * 0.5);
                tankHeatLoss = this.baseTankHeatLoss * (1 + factor);
            }

            const Heat_loss_to_environment = tankHeatLoss * tempDifference;

            // Sıcaklık güncelle
            TankTemp += (Heat_input_from_solar - Heat_loss_to_environment) *
                this.dt / (massWaterTank * this.heatCapacityWater);

            // Grafiği şişirmemek için sadece HER SAATTE bir nokta ekle
            if (Math.floor(t) % 3600 === 0) {
                timeHours.push(t / 3600);
                temps.push(TankTemp);
            }

            // Gün sonu için tablo kaydı
            if (t > 0 && (t % 86400) === 0) {
                day_index += 1;
                dailyTemps.push({
                    day: day_index,
                    temp: TankTemp
                });
            }

            t += this.dt;
        }

        return {
            finalTemp: TankTemp,
            pumpHours: Pump_hours,
            daysSimulated: this.days,
            timeHours: timeHours,
            temps: temps,
            dailyTemps: dailyTemps
        };
    }
}

// ---- UI / uygulama sınıfı ----
class TankSimulationApp {
    constructor() {
        this.tempChart = null;
        this.errorDiv = document.getElementById("error-message");
        this.resultsDiv = document.getElementById("results");
        this.runButton = document.getElementById("runButton");
    }

    init() {
        if (!this.runButton) {
            return;
        }
        this.runButton.addEventListener("click", () => {
            this.handleRunClick();
        });
    }

    handleRunClick() {
        if (this.errorDiv) {
            this.errorDiv.textContent = "";
        }
        if (this.resultsDiv) {
            this.resultsDiv.innerHTML = "";
        }

        const inputResult = this.readAndValidateInputs();
        if (!inputResult.ok) {
            if (this.errorDiv) {
                this.errorDiv.textContent = inputResult.message;
            }
            return;
        }

        const simParams = inputResult.values;

        const simulator = new SolarTankSimulator(simParams);
        const simulationResult = simulator.run();

        this.showResults(simulationResult);
        this.drawTemperatureChart(simulationResult.timeHours, simulationResult.temps);
    }

    readAndValidateInputs() {
        const Panel_area = parseFloat(this.getValue("panelArea"));
        const Tank_Volume = parseFloat(this.getValue("tankVolume"));
        const Daily_avg_temp = parseFloat(this.getValue("avgTemp"));
        const Daily_sun_time_hours = parseFloat(this.getValue("sunHours"));
        let days = parseFloat(this.getValue("days"));
        const basePanelEfficiency = parseFloat(this.getValue("baseEfficiency"));
        const Solar_peak = parseFloat(this.getValue("peakIrradiance"));
        const baseTankHeatLoss = parseFloat(this.getValue("baseLoss"));

        if (
            isNaN(Panel_area) || isNaN(Tank_Volume) || isNaN(Daily_avg_temp) ||
            isNaN(Daily_sun_time_hours) || isNaN(days) ||
            isNaN(basePanelEfficiency) || isNaN(Solar_peak) || isNaN(baseTankHeatLoss)
        ) {
            return {
                ok: false,
                message: "Error: Please fill in all fields with valid numbers."
            };
        }

        if (Panel_area <= 0 || Tank_Volume <= 0 || Daily_sun_time_hours <= 0) {
            return {
                ok: false,
                message: "Error: Panel area, tank volume, and sunlight duration must be positive numbers."
            };
        }

        if (days <= 0) {
            return {
                ok: false,
                message: "Error: Number of days must be positive."
            };
        }

        if (days > 30) {
            days = 30;
        }

        if (basePanelEfficiency <= 0 || basePanelEfficiency > 1) {
            return {
                ok: false,
                message: "Error: Base panel efficiency must be between 0 and 1."
            };
        }

        if (Solar_peak <= 0) {
            return {
                ok: false,
                message: "Error: Peak solar irradiance must be positive."
            };
        }

        if (baseTankHeatLoss <= 0) {
            return {
                ok: false,
                message: "Error: Base tank heat loss coefficient must be positive."
            };
        }

        return {
            ok: true,
            values: {
                Panel_area: Panel_area,
                Tank_Volume: Tank_Volume,
                Daily_avg_temp: Daily_avg_temp,
                Daily_sun_time_hours: Daily_sun_time_hours,
                days: days,
                basePanelEfficiency: basePanelEfficiency,
                Solar_peak: Solar_peak,
                baseTankHeatLoss: baseTankHeatLoss
            }
        };
    }

    getValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : "";
    }

    showResults(simulationResult) {
        if (!this.resultsDiv) {
            return;
        }

        const finalTempText =
            "Final tank temperature after " +
            simulationResult.daysSimulated +
            " days: <b>" +
            simulationResult.finalTemp.toFixed(2) +
            " °C</b>";

        const pumpHoursText =
            "Pump ran for <b>" +
            simulationResult.pumpHours.toFixed(2) +
            " hours</b> in total.";

        let dailyTableHtml = "";
        if (simulationResult.dailyTemps && simulationResult.dailyTemps.length > 0) {
            dailyTableHtml += "<h3>Daily Tank Temperatures</h3>";
            dailyTableHtml += "<table><thead><tr><th>Day</th><th>Tank Temperature (°C)</th></tr></thead><tbody>";

            simulationResult.dailyTemps.forEach(function (item) {
                dailyTableHtml +=
                    "<tr><td>" +
                    item.day +
                    "</td><td>" +
                    item.temp.toFixed(2) +
                    "</td></tr>";
            });

            dailyTableHtml += "</tbody></table>";
        }

        this.resultsDiv.innerHTML =
            "<h2>Results</h2>" +
            "<p>" + finalTempText + "</p>" +
            "<p>" + pumpHoursText + "</p>" +
            dailyTableHtml +
            "<p class='small-text'>Note: This is a simplified engineering model with non-uniform solar irradiance, " +
            "temperature-dependent panel efficiency and dynamic heat loss.</p>";
    }

    drawTemperatureChart(timeHours, temps) {
        const canvas = document.getElementById("tempChart");
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext("2d");

        if (this.tempChart !== null) {
            this.tempChart.destroy();
        }

        this.tempChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: timeHours,
                datasets: [{
                    label: "Tank Temperature (°C)",
                    data: temps,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Time (hours)"
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Tank Temperature (°C)"
                        }
                    }
                }
            }
        });
    }
}

// Sayfa yüklendiğinde uygulamayı başlat
window.addEventListener("DOMContentLoaded", function () {
    const app = new TankSimulationApp();
    app.init();
});
