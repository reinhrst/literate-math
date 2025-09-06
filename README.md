# Literate Math

Literate Math is an [Obsidian][1] plugin, that allows writing of stories with math (often math-with-units/physics) in them. It was developed because I often brainstorm using some back-of-envelope calculations, and I wanted to automate that.

Let's say that I wanted to know how long it would take for my heat pump to heat up my swimming pool.
In that case I can write something like this:

```md
So let's assume my swimming pool has the following dimensions:
`!$=len =7.2m`
`!$@width =3.6m`
`!$@depth =1.6m`

At the start of the season, the water will be `!T_start = 10 degC`, and I want to heat it to `!T_end = 25 degC`
The Specific Heat Capacity for water is `!shc = 4184 J/kg/K`, the density of water is `!=density=1kg/l`
My heatpump can produce `!HP_cap = 7 kW` and will run in spring with a COP of `!cop=5`.
The price of electricity is `!cost=0.30EUR/kWh`


In total there is `!=volume=len * width * depth` of water (`!mass = volume * density`), needing `!energy_needed=mass*shc*(T_end-T_start) in kWh` of energy to heat up.
This will take `!energy_needed / HP_cap in hours` and use `!=electricity_needed=energy_needed / cop` of electricity, costing `!electricity_needed * cost`.

(Note that this assumes no loss of heat during the process)
```

and the Literate Math plugin converts this in real-time (literally while you write the document in Obsidian) to

> So let's assume my swimming pool has the following dimensions:
> `len = 7.2 m`
> `width = 3.6 m`
> `depth = 1.6 m`
> 
> At the start of the season, the water will be `10 degC`, and I want to heat it to `25 degC`
> The Specific Heat Capacity for water is `4184 J / kg / K`, the density of water is `1 kg / l`
> My heatpump can produce `7 kW` and will run in spring with a COP of `4`.
> The price of electricity is `0.3 EUR / kWh`
> 
> In total there is `41472 l` of water (`41472 kg`), needing `723` kWh of energy to heat up.
> This will take `103.3` hours and use `180.7` kWh of electricity, costing `54.22 EUR`.
> 
> (Note that this assumes no loss of heat during the process)

You can easily change any of the assumptions here and see what the result is.

Literate Math uses `mathjs` under the hood.
This system has support for units and automatically will convert between them (so no worries if you have the length of your pool only in `feet` or you prefer your water temperatures in `degF`.
As an added benefit, this directly shows you if you do something wrong, the units of the answer are not what you expect (e.g. if you would try `energy_needed=volume*shc*(T_end-T_start)`, the unit would be `m^5 / hours^2`, reminding you that you need to convert volume to mass first).


## How to install

Right now the plugin is not yet an official Obsidian community plugin, so you will have to install it through BRAT (which is a community plugin):

- Add `https://github.com/reinhrst/literate-math` to BRAT by going to settings --> BRAT --> Add beta plugin.
- Choose the latest version, and install and active the plugin.

### Manual install

To manually install it, just download the latest release from the [releases page][2] and unpack that in `#YOUR VAULT DIRECTORY#/.obsidian/plugins/literate-math`


## How to work with the plugin

You just write your normal story, however as soon as you want to put in a number, type `` `! ``.
This opens a literate-math section (it's closed by another `` ` ``).

Generally these sections have one of two formats:

`` `!expression` `` or `` `!variable=expression` ``

`expression` can be a constant (eg `5 feet`), or some formula of constants and variables that were used before.
`expression` can also convert to some other unit (eg `3 feet + 3 inches in meters`)

If you want to refer a variable created before, you can hover over it with the mouse to see the variable name, and ctrl/cmd-click on it to add it to your formula.

As soon as you move out of the section (move your cursor past the last `` ` `` or press enter), the section is evaluated and the result is shown.
If there is an error evaluating the code, the error is shown in red instead.

### Variable names

I have found that it's super easy to overwrite units and built in constants with variables (e.g. `` `!l=7.2m`, `!w=3.6m` `!h=1.6m` ``).

The code above works fine, until you want to use the unit `l` (for litre) and everything gets messy (it will give you errors that will take some time to debug).

As a rule of thumb, I tend to not use 1 letter variable names.

### What parts to output

Right after the initial exclamation mark (before the expression or the variable) one can specify the output format:

- Using a `$` will show the assignment part (will result in an error if there is no assignment)
- Using `@` will show the expression part
- Using `=` will show the result. The `=` may optionally be followed by `{format; unit}`, where `format` is either `.xf` or `.xg` (`x` being a number) to specify decimals or number of significant digits. `unit` defines the unit that the result is shown in (both `format` and `unit` may be empty strings). Note that literate-math tries to format numbers is a reasonable format, but you 

If no output format section is present, then `=` is used as default.

Finally, if only a `!` is used as format (so that means something like `` `!!x=4m` ``, then no output is generated at all.

### Units

All unit support comes from the [`mathjs`][3] library; if you know how to use a certain unit, ask there).
Most units are present multiple times; for instance `m`, `meter` and `meters` all point to the same thing.
Square and cubed meters can be written as `m2`, `m3` or `m^2`, `m^3`, etc.

Degrees Celsius and Fahrenheit are `degC` and `degF` (`°C` seems to be unsupported).

`mathjs` chooses the best unit for the output (or: what it thinks best; usually preferring the unit used to define the value); if you want something else you have two options.

- `` `!x=200 m^2 in cm^2` ``
- `` `!={;cm^2}x=200 m^2` ``

These two methods are very similar; the only small difference is that in the former `x` will be `2000000 cm^2` whereas in the latter the conversion to `cm^2` was only done for the output.

#### Currencies

I quickly ran into needing support for currencies (which are units as well).
For now I added support for `EUR` only; it's easy to add more currencies, however I think it may be better to come up with a way to add currencies (and other units) from within the document.

Let me know if this is something you need.

## How to show a normal code block starting with exclamation mark

If for some reason you have code blocks starting with exclamation mark that are not literate-math, you will have to prefix them with a space.
If you run into this problem, please report it, and I'm happy to work with you towards a solution.


## Security

In general it's good to be weary of other people's Obsidian documents and not import them without checking what it is.
Having said that, literate-math uses `mathjs`'s `evaluate()` function, [which has been designed to be safe][4] (however, like always, security issues may still exist).

I intend to sandbox the whole `mathjs` code at some point in the future, adding another layer of security.


[1]: https://obsidian.md
[2]: https://github.com/reinhrst/literate-math/tags
[3]: https://mathjs.org
[4]: https://mathjs.org/docs/expressions/security.html
