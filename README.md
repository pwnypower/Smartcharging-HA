🔋 Frank Energie - Smart Battery Manager
The ultimate "Set & Forget" automation for home batteries with dynamic energy tariffs.

This blueprint turns your Home Assistant into an intelligent energy manager. It calculates the optimal charging schedule based on day-ahead prices (Frank Energie, Tibber, Zonneplan), solar forecasts, and your battery usage.

It solves the "Empty Battery Anxiety" by guaranteeing a charged battery in the morning, while still optimizing for the lowest possible costs during the rest of the day.

✨ Key Features
🧠 Intelligent Scheduling: Analyzes prices for today and tomorrow to find the absolute cheapest hours.

☕ Morning Guarantee: Ensures you wake up with a charged battery (e.g., 50%) for the morning peak, prioritizing cheap night hours, even if the afternoon is cheaper.

☀️ Solar Forecasting: Automatically adjusts charge targets based on the weather. Expecting sun? It leaves space in the battery. Dark winter day? It charges fully from the grid.

💰 Smart Holding (Trading Logic): Prevents the battery from discharging (or charging) when it's not profitable. It remembers your buy price and only allows usage if the current price exceeds the Buy Price + Profit Margin.

🛡️ Hardware Protection: Includes "Anti-Cycling" logic. Once charging starts, it stays active for at least 30 minutes to protect your inverter's EEPROM/Flash memory from excessive switching.

📊 Daily Reporting: Sends a detailed plan to your phone every morning and evening (Status, Financial thresholds, Scheduled hours).

🌍 Multi-Language: Fully localized in English and Dutch (Nederlands).

⚙️ Prerequisites
Before importing this blueprint, ensure you have the following in Home Assistant:

1. Integrations
Dynamic Price Sensor: An integration that provides current and future electricity prices (e.g., Frank Energie, Tibber, ENTSO-e). The sensor must have a prices (or similar) attribute containing future data.

Solar Forecast: The standard Forecast.Solar integration (configured for your location).

2. Helpers (Required!)
You must create one helper manually for the "Smart Holding" logic to work. Go to Settings > Devices & Services > Helpers > Create Helper:

Input Number (Required):

Name: Last Purchase Price (or Laatste Laadprijs)

Icon: mdi:currency-eur

Min: 0, Max: 5

Step: 0.001

Purpose: The automation saves the electricity price here when it starts charging, so it knows when it's profitable to hold or discharge later.

Input Boolean (Optional):

Name: Battery Boost

Purpose: A manual switch to force-charge the battery to 100% immediately, ignoring all logic.

🚀 Installation & Configuration
Click the Import to Home Assistant badge above.

Create a new automation using the blueprint.

Map your entities (Battery SoC, Switches, Price Sensor).

🔧 Key Settings Explained
🛡️ Morning Guarantee (%)
What is it? The minimum percentage you need to survive the morning peak (07:00 - 12:00).

How it works: If it's night and your battery is below this level, the system will charge during the cheapest night hours, even if the price is effectively "high" compared to the afternoon.

Recommended: 40% - 60%.

📈 Min. Profit Margin (%)
What is it? The financial buffer.

How it works: The system calculates the strict hours needed to reach your target. Any extra "buffer" hours are only charged if the price is X% lower than the daily average.

Recommended:

5% - 10%: Focus on comfort (Full battery is priority).

20%+: Focus on ROI (Only charge when it's a steal).

☀️ Summer Threshold (kWh)
What is it? The boundary between a "Sunny Day" and a "Dark Day".

How it works:

Forecast > Threshold: Uses Target Summer (e.g., 30%). Leaves room for free solar energy.

Forecast < Threshold: Uses Target Winter (e.g., 90%). Fills up from the grid.

🧠 Logic Flow (How it thinks)
Every 5 minutes (and on price changes), the automation performs this check:

Safety Check: Are we in a valid time slot (Night/Day)?

Morning Check: Is it night, and is SoC < Morning Guarantee?

Yes: Find cheapest hours in the Night Slot to bridge the gap. -> Charge.

Target Check: Is SoC < Daily Target (Winter/Summer)?

Yes: Calculate total hours needed. Find cheapest hours in All Slots (Night + Day).

Strict Check: Is current price one of the absolute cheapest? -> Charge.

Buffer Check: Is current price profitable (< Daily Average - Margin)? -> Charge.

Holding Check: If we are NOT charging:

Is current price < (Last Buy Price + Margin)? -> Block Discharge (Hold energy).

Is current price High? -> Allow Discharge (Save money).

❓ FAQ
Q: I see "No charging planned" in the report, but the price is low. A: The price might be low, but the system sees even lower prices coming up later in your allowed time slots. It waits for the bottom.

Q: Why does it keep charging for 30 minutes even if the price went up? A: This is the EEPROM Protection. To prevent your inverter hardware from wearing out due to constant switching, the charger enforces a minimum runtime of 30 minutes (unless the battery reaches 100%).

Q: The report says "Morning" and "Strict". What's the difference? A: Morning means charging is forced to ensure you survive the morning. Strict means charging is purely based on the absolute lowest prices of the next 24-36 hours.

📄 License
This project is licensed under the MIT License - feel free to modify and share.

Version: 1.0 (Production)

Author: Pwnypower
