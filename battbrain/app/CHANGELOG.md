# Changelog

## 0.4.1
- Zoncorrectie: BattBrain meet per dag de echte zonopbrengst en vergelijkt die met de ochtendvoorspelling;
  na 3 volle dagen rekent het plan met die correctie.
- Veiligheid: een reserveschakelaar die "niet beschikbaar" is, telt als onbekend; BattBrain stuurt dan niets.
- Eén ronde tegelijk: een klik op pauzeren kan niet meer samenvallen met een lopende sturingsronde.
- Lettertypes Space Grotesk en Manrope meegeleverd (werkt zonder internet).
- Een negatieve besparing tot nu toe (laden kost nu, levert later op) staat niet meer in het groen en krijgt uitleg.

## 0.4.0
- Sturing (opt-in, `control_mode: control`): BattBrain zet de reserveschakelaar en het doel-SoC volgens het plan.
- Veiligheid: terugval naar zelfverbruik bij twijfel, maximale laadprijs, anti-flapperen, controle of de omvormer volgt,
  blokkade zolang je oude automatisering aan staat, doel-SoC binnen [reserve, 100].
- Dashboard: kaart *Sturing* met status, laatste commando en knoppen Pauzeer 1 uur / Hervat.

## 0.3.0
- Gemeten besparing: BattBrain meet per dag wat je netafname kostte en wat het zonder batterij had gekost; grafiek van de afgelopen 7 dagen.
- Plangrafiek in drie banen: laadtoestand, wat de batterij doet, en prijs per kwartier gekleurd naar prijsniveau (laag/midden/hoog) met daggemiddelde.
- Prijskaart met minigrafiek van vandaag en het daggemiddelde.
- Batterijkaart toont wanneer de batterij volgens plan vol of op reserve is.
- Demo rekent een hele dag door met de planner, zodat alle getallen bij elkaar passen.
- "Vasthouden" alleen bij een betekenisvolle lading boven de reserve.

## 0.2.0
- Adviesmodus: plan per kwartier met de BattBrain-planner, met reden per beslissing.
- Vergelijking met je huidige sturing (reserveschakelaar en doel-SoC) en % overeenkomst per dag.
- Verbruiksprofiel uit je Home Assistant-geschiedenis; zonvoorspelling verdeeld over de dag.
- Klaar voor 2027: na `saldering_end` rekent BattBrain met een lagere terugleververgoeding.
- Nieuw ontwerp: groot advies bovenaan, bewegende energiestroom, plangrafiek, beslissingenlogboek.

## 0.1.0
- Eerste beta: dashboard met laadtoestand, prijs, zon, energiestroom en prijsverloop.
- Alleen lezen: BattBrain stuurt nog niets aan.
- Demomodus.
