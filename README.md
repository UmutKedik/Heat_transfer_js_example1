#☀️ Solar Water Tank Simulation (HTML/CSS/JS)

This small project is something play around with how a solar-heated water tank might behave over time.
The goal wasn’t to create a perfect scientific model, but to have a simple browser-based simulation where you can change a few parameters and see how the tank temperature moves. Everything runs inside the browser—no backend, no frameworks, just plain JS + a chart.

I tried to keep the logic readable so I can adjust things later if needed.

##🔧 What the Simulation Does

The simulation estimates tank temperature changes based on:

solar irradiance

panel area

tank volume

heat losses to environment

panel efficiency (drops slightly when tank gets hotter)

average outside air temperature

how many hours you want to simulate

starting tank temperature

Every minute of simulated time, the code calculates:

incoming solar heat (only during sun hours)

heat loss to outside air

new tank temperature

Then it records one value per hour so the chart doesn’t explode.

🖥️ Tech Used

HTML – simple form + layout

CSS – small dark theme

JavaScript – all logic lives here

Chart.js – for the graph (temperature vs time)

Everything is in three separate files for clarity:
index.html, style.css, script.js.

▶️ How to Run It

Just open index.html in any browser.
No server required.

📝 How to Use

When the page loads:

Enter panel area (m²)

Enter tank volume (L)

Enter starting tank temperature

Set average outdoor temp

Set how many sunlight hours your area has

Choose simulation time in hours

Hit Run Simulation

You’ll see:

final tank temperature

total pump runtime

temperature curve over the whole period


Model Equations

Solar irradiance:
I(t) = I_peak * sin( π * (t_day / t_sun) )

Temperature-dependent efficiency:
eta(T) = eta_base - 0.002 * (T - 25)

Solar gain:
Q_solar = A * I(t) * eta(T)

Heat loss:
Q_loss = k * (T - T_amb)

Energy balance:
T_new = T_old + (Q_solar - Q_loss) / (m * c_p) * dt
