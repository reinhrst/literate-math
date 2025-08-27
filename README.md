# Literate Math

Literate Math is an [Obsidian][1] plugin, that allows writing of stories with math (often math-with-units/physics) in them. It was developed because I often brainstorm using some back-of-envelope calculations, and I wanted to automate that.

Let's say that I wanted to know how long it would take for my heat pump to heat up my swimming pool.
In that case I can write something like this:

```md
So let's assume my swimming pool has the following dimensions:
`!$@len =7.2m`
`!$@width =3.6m`
`!$@depth =1.6m`

At the start of the season, the water will be `!T_start = 10 degC`, and I want to heat it to `!T_end = 25 degC`
The Specific Heat Capacity for water is `!shc = 4184 J/kg/K`, the density of water is `!density=1kg/l`
My heatpump can produce `!HP_cap = 7 kW` and will run in spring with a COP of `!cop=4`.
The price of electricity is `!cost=0.30EUR/kWh`


In total there is `!={;l}volume=len * width * depth` of water (`!=mass = volume * density`), needing `!={;kWh} energy_needed=mass*shc*(T_end-T_start)` of energy to heat up.
This will take `!={;hours}energy_needed / HP_cap` and use `!=electricity_needed=energy_needed / cop` of electricity, costing `!=electricity_needed * cost`.

(Note that this assumes no loss of heat during the process)
```

and the Literate Math plugin converts this in real-time (literally while you write the document in Obsidian) to

```markdown
So let's assume my swimming pool has the following dimensions:
`len = 7.2 m`
`width = 3.6 m`
`depth = 1.6 m`

At the start of the season, the water will be `10 degC`, and I want to heat it to `25 degC`
The Specific Heat Capacity for water is `4184 J / kg / K`, the density of water is `1 kg / l`
My heatpump can produce `7 kW` and will run in spring with a COP of `4`.
The price of electricity is `0.3 EUR / kWh`

In total there is `41472 l` of water (`41472 kg`), needing `723` kWh of energy to heat up.
This will take `103.3` hours and use `180.7` kWh of electricity, costing `54.22 EUR`.

(Note that this assumes no loss of heat during the process)
```

You can easily change any of the assumptions here and see what the result is.

Literate Math uses `mathjs` under the hood.
This system has support for units and automatically will convert between them (so no worries if you have the length of your pool only in `feet` or you prefer your water temperatures in `degF`.
As an added benefit, this directly shows you if you do something wrong, the units of the answer are not what you expect (e.g. if you would try `energy_needed=volume*shc*(T_end-T_start)`, the unit would be `m^5 / hours^2`, reminding you that you need to convert volume to mass first).


## How to install

For now it's a manual install:

- clone this repository
- run `npm install && npm run build`
- copy the generated files (`main.js` and `style.css`) together with `manifest.json` to a `literate-math` subdir in your obsidian vault plugins directory.
- Restart obsidian, and under settings -> community plugins, make sure that the `literate math` plugin is enabled

## How to use it

[1]: https://obsidian.md
