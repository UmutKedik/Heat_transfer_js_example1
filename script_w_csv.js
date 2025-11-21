// small sim class
class SolarTankSimulator {
    constructor(opts) {
        // take values from form
        this.Panel_area = opts.Panel_area;
        this.Tank_Volume = opts.Tank_Volume;
        this.Daily_avg_temp = opts.Daily_avg_temp;
        this.Daily_sun_time_hours = opts.Daily_sun_time_hours;
        this.Simulation_hours = opts.Simulation_hours;
        this.basePanelEfficiency = opts.basePanelEfficiency;
        this.Solar_peak = opts.Solar_peak;
        this.baseTankHeatLoss = opts.baseTankHeatLoss;
        this.Starting_tank_temp = opts.Starting_tank_temp;

        // constants
        this.dt = 60;                 // timestep in seconds (1 min)
        this.densityWater = 1.0;      // assume 1L = 1kg
        this.heatCapacityWater = 4180.0;
    }

    run() {
        const massWaterTank = this.Tank_Volume * this.densityWater;
        const sim_time = Math.floor(this.Simulation_hours * 3600); // hours to sec
        const sunDuration = this.Daily_sun_time_hours * 3600;

        let TankTemp = this.Starting_tank_temp;
        let Pump_hours = 0;
        let t = 0;

        let totalE = 0; // total collected energy (J)

        const timeHours = [];
        const temps = [];

        // basic time loop
        while (t <= sim_time) {
            const timeOfDay = t % 86400; // seconds inside one day
            let Heat_input_from_solar = 0;

            // when sun is up we add energy
            if (timeOfDay < sunDuration) {
                const dayProgress = timeOfDay / sunDuration;
                let sunShape = Math.sin(Math.PI * dayProgress); // rough shape
                if (sunShape < 0) { sunShape = 0; }

                const currentIrradiance = this.Solar_peak * sunShape;

                // panel make less good when temp high
                let panelEfficiency =
                    this.basePanelEfficiency - 0.002 * (TankTemp - 25);

                if (panelEfficiency < 0.5) panelEfficiency = 0.5;
                else if (panelEfficiency > 0.9) panelEfficiency = 0.9;

                Heat_input_from_solar =
                    this.Panel_area * currentIrradiance * panelEfficiency;

                Pump_hours += this.dt / 3600;

                totalE += Heat_input_from_solar * this.dt; // W*s = J
            }

            // heat go out when tank hotter than air
            const tempDifference = TankTemp - this.Daily_avg_temp;
            let tankHeatLoss = this.baseTankHeatLoss;

            if (tempDifference > 0) {
                let factor = (tempDifference / 40) * 0.5; // just guess curve
                if (factor > 0.5) factor = 0.5;
                tankHeatLoss = this.baseTankHeatLoss * (1 + factor);
            }

            const Heat_loss_to_environment = tankHeatLoss * tempDifference;

            // very simple energy balance
            TankTemp += (Heat_input_from_solar - Heat_loss_to_environment) *
                this.dt / (massWaterTank * this.heatCapacityWater);

            // save only one point each hour for chart, otherwise too heavy
            if ((t % 3600) === 0) {
                timeHours.push(t / 3600);
                temps.push(TankTemp);
            }

            t += this.dt;
        }

        return {
            finalTemp: TankTemp,
            pumpHours: Pump_hours,
            hoursSimulated: this.Simulation_hours,
            timeHours: timeHours,
            temps: temps,
            totalE_kWh: totalE / 3600000   // J> kWh
        };
    }
}

// simple ui controller
class TankSimulationApp {
    constructor() {
        this.tempChart = null;
        this.errorDiv = document.getElementById("error-message");
        this.resultsDiv = document.getElementById("results");
        this.runButton = document.getElementById("runButton");

        this.lastResult = null;   // keep last simulation result for csv
    }

    init() {
        const btn = this.runButton;
        if (btn) {
            // handler with bind
            btn.addEventListener("click", this.handleRunClick.bind(this));
        }

        // hook csv download button
        const dlBtn = document.getElementById("downloadCsvButton");
        if (dlBtn) {
            dlBtn.addEventListener("click", this.downloadCsv.bind(this));
        }
    }

    handleRunClick() {
        if (this.errorDiv) this.errorDiv.textContent = "";
        if (this.resultsDiv) this.resultsDiv.innerHTML = "";

        const inputResult = this.readAndValidateInputs();

        if (!inputResult.ok) {
            if (this.errorDiv) this.errorDiv.textContent = inputResult.message;
            return;
        }

        const simParams = inputResult.values;
        const sim = new SolarTankSimulator(simParams);
        const result = sim.run();

        // remember last run for csv export
        this.lastResult = result;

        this.showResults(result);
        this.drawTemperatureChart(result.timeHours, result.temps);
    }

    readAndValidateInputs() {
        const Panel_area = parseFloat(this._val("panelArea"));
        const Tank_Volume = parseFloat(this._val("tankVolume"));
        const Daily_avg_temp = parseFloat(this._val("avgTemp"));
        const Daily_sun_time_hours = parseFloat(this._val("sunHours"));
        const Simulation_hours = parseFloat(this._val("simHours"));
        const basePanelEfficiency = parseFloat(this._val("baseEfficiency"));
        const Solar_peak = parseFloat(this._val("peakIrradiance"));
        const baseTankHeatLoss = parseFloat(this._val("baseLoss"));
        const Starting_tank_temp = parseFloat(this._val("startingTemp"));

        const arr = [
            Panel_area, Tank_Volume, Daily_avg_temp,
            Daily_sun_time_hours, Simulation_hours,
            basePanelEfficiency, Solar_peak,
            baseTankHeatLoss, Starting_tank_temp
        ];

        if (arr.some(n => isNaN(n))) {
            return { ok: false, message: "Error: some field not number value." };
        }

        if (Panel_area <= 0 || Tank_Volume <= 0 || Daily_sun_time_hours <= 0) {
            return { ok: false, message: "Panel area, tank volume and sunlight must be > 0." };
        }

        if (Simulation_hours <= 0) {
            return { ok: false, message: "Simulation hours need positive value." };
        }

        if (basePanelEfficiency <= 0 || basePanelEfficiency > 1) {
            return { ok: false, message: "Panel efficiency should stay between 0 and 1." };
        }

        if (Solar_peak <= 0) {
            return { ok: false, message: "Peak irradiance must be more than zero." };
        }

        if (baseTankHeatLoss <= 0) {
            return { ok: false, message: "Heat loss coefficient must be > 0." };
        }

        return {
            ok: true,
            values: {
                Panel_area: Panel_area,
                Tank_Volume: Tank_Volume,
                Daily_avg_temp: Daily_avg_temp,
                Daily_sun_time_hours: Daily_sun_time_hours,
                Simulation_hours: Simulation_hours,
                basePanelEfficiency: basePanelEfficiency,
                Solar_peak: Solar_peak,
                baseTankHeatLoss: baseTankHeatLoss,
                Starting_tank_temp: Starting_tank_temp
            }
        };
    }

    _val(id) {
        const el = document.getElementById(id);
        return el ? el.value : "";
    }

    showResults(simulationResult) {
        const r = simulationResult;

        const finalText =
            "Final tank temperature after " +
            r.hoursSimulated.toFixed(1) +
            " hours: <b>" +
            r.finalTemp.toFixed(2) +
            " °C</b>";

        const pumpText =
            "Pump ran for <b>" +
            r.pumpHours.toFixed(2) +
            " hours</b> in total.";

        const eText =
            "Total collected energy: <b>" +
            r.totalE_kWh.toFixed(2) +
            " kWh</b>";

        if (this.resultsDiv) {
            this.resultsDiv.innerHTML =
                "<h2>Results</h2><p>" +
                finalText +
                "</p><p>" +
                pumpText +
                "</p><p>" +
                eText +
                "</p>";
        }
    }

    drawTemperatureChart(timeHours, temps) {
        const canvas = document.getElementById("tempChart");
        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        if (this.tempChart) {
            this.tempChart.destroy();
            this.tempChart = null;
        }

        //chart config
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
                interaction: { mode: "index", intersect: false },
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

    // csv download
    downloadCsv() {
        if (!this.lastResult) {
            alert("Once simule et, sonra indir.");
            return;
        }

        var r = this.lastResult;
        var text = "time_hours,tank_temp_C\n";

        var times = r.timeHours || [];
        var temps = r.temps || [];

        for (var i = 0; i < times.length; i++) {
            text += times[i].toFixed(2) + "," + temps[i].toFixed(2) + "\n";
        }

        var blob = new Blob([text], { type: "text/csv" });
        var link = document.createElement("a");

        link.href = URL.createObjectURL(blob);
        link.download = "tank_simulation.csv";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(function () {
            URL.revokeObjectURL(link.href);
        }, 1000);
    }
}

// small bootstrap for app
(function () {

    // this function just create app and run
    function startSimApp() {
        // avoid create two time if browser call again
        if (window._tankAppStarted) {
            return;
        }
        window._tankAppStarted = true;

        var appObj = new TankSimulationApp();  // make new app object
        appObj.init();                        // call init
    }

    // if document already loaded,just run little later
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(startSimApp, 0);
    } else {
        // normal case, wait dom ready and then start
        document.addEventListener("DOMContentLoaded", startSimApp);
    }

})();
