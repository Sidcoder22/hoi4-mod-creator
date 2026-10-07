// Nachgebauter, winziger HOI4-Spielordner fuer Tests und den Selbsttest.
// Spaetere Tests verlassen sich auf genau diese Inhalte (siehe Bauplan, Task 4).

import { schreibeBmp24 } from '../leser/bmp.js'
import { schreibeYml } from '../leser/yml.js'
import { schreibeTga, schreibeDds } from '../erzeuger/bilder.js'

function einfarbig(breite, hoehe, [r, g, b]) {
  const rgba = new Uint8ClampedArray(breite * hoehe * 4)
  for (let i = 0; i < breite * hoehe; i++) rgba.set([r, g, b, 255], i * 4)
  return rgba
}

function karte() {
  const breite = 64, hoehe = 32
  const rgb = new Uint8Array(breite * hoehe * 3)
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const provinz = (y < 16 ? 1 : 5) + Math.floor(x / 16)
      const farbe = provinz === 8 ? [0, 0, 200] : [provinz * 20, 0, 0]
      rgb.set(farbe, (y * breite + x) * 3)
    }
  }
  return schreibeBmp24(rgb, breite, hoehe)
}

function staat(id, name, besitzer, kerne, provinzen, manpower, kategorie = 'town') {
  return `state = {
	id = ${id}
	name = "${name}"
	manpower = ${manpower}
	state_category = ${kategorie}
	history = {
		owner = ${besitzer}
${kerne.map(k => `		add_core_of = ${k}`).join('\n')}
	}
	provinces = { ${provinzen.join(' ')} }
}
`
}

export function erstelleMiniSpielordner() {
  const o = {}
  o['launcher-settings.json'] = '{"gameId":"hoi4","version":"Seelöwe v1.15.4.0c7d","rawVersion":"v1.15.4.0c7d"}'

  o['common/country_tags/00_countries.txt'] = 'GER = "countries/Germany.txt"\nSWI = "countries/Switzerland.txt"\nFRA = "countries/France.txt"\n'
  o['common/country_tags/01_countries.txt'] = 'dynamic_tags = yes\nD01 = "countries/D01.txt"\n'
  const landDatei = (farbe) => `graphical_culture = western_european_gfx\ngraphical_culture_2d = western_european_2d\n\ncolor = { ${farbe.join(' ')} }\n`
  o['common/countries/Germany.txt'] = landDatei([75, 75, 75])
  o['common/countries/Switzerland.txt'] = landDatei([200, 30, 30])
  o['common/countries/France.txt'] = landDatei([57, 57, 195])
  o['common/countries/colors.txt'] = '#reload countrycolors\n' +
    'GER = {\n\tcolor = rgb { 75 75 75 }\n\tcolor_ui = rgb { 115 115 115 }\n}\n' +
    'SWI = {\n\tcolor = rgb { 200 30 30 }\n\tcolor_ui = rgb { 255 61 61 }\n}\n' +
    'FRA = {\n\tcolor = rgb { 57 57 195 }\n\tcolor_ui = rgb { 93 93 255 }\n}\n'

  o['common/ideologies/00_ideologies.txt'] = `ideologies = {
	democratic = {
		types = { conservatism = { } liberalism = { } socialism = { } }
		color = { 0 0 255 }
	}
	communism = {
		types = { marxism = { } leninism = { } stalinism = { } }
		color = { 255 0 0 }
	}
	fascism = {
		types = { nazism = { } fascism_ideology = { } }
		color = { 150 75 0 }
	}
	neutrality = {
		types = { despotism = { } oligarchism = { } }
		color = { 128 128 128 }
	}
}
`
  o['common/characters/GER.txt'] = `characters = {
	GER_adolf_hitler = {
		name = "Adolf Hitler"
		portraits = {
			civilian = { large = GFX_portrait_GER_adolf_hitler }
		}
		country_leader = {
			ideology = nazism
			expire = "1965.1.1.1"
			id = -1
		}
	}
}
`
  o['common/characters/SWI.txt'] = `characters = {
	SWI_giuseppe_motta = {
		name = SWI_giuseppe_motta
		country_leader = {
			ideology = conservatism
			expire = "1965.1.1.1"
			id = -1
		}
	}
}
`
  o['history/countries/GER - Germany.txt'] = `capital = 1
oob = "GER_1936"
set_research_slots = 4
set_stability = 0.6
set_war_support = 0.3
set_technology = {
	infantry_weapons = 1
	infantry_weapons1 = 1
	tech_support = 1
}
set_politics = {
	ruling_party = fascism
	last_election = "1933.3.5"
	election_frequency = 48
	elections_allowed = no
}
set_popularities = {
	democratic = 10
	fascism = 70
	communism = 5
	neutrality = 15
}
recruit_character = GER_adolf_hitler
1939.1.1 = {
	set_technology = { infantry_weapons2 = 1 }
}
`
  o['history/countries/SWI - Switzerland.txt'] = `capital = 3
set_research_slots = 3
set_stability = 0.8
set_war_support = 0.1
set_technology = {
	infantry_weapons = 1
}
set_politics = {
	ruling_party = democratic
	last_election = "1935.10.27"
	election_frequency = 48
	elections_allowed = yes
}
set_popularities = {
	democratic = 80
	fascism = 5
	communism = 5
	neutrality = 10
}
recruit_character = SWI_giuseppe_motta
`
  o['history/countries/FRA - France.txt'] = `capital = 5
set_research_slots = 3
set_stability = 0.5
set_war_support = 0.2
set_politics = {
	ruling_party = democratic
	last_election = "1932.5.1"
	election_frequency = 48
	elections_allowed = yes
}
set_popularities = {
	democratic = 60
	fascism = 10
	communism = 20
	neutrality = 10
}
`
  o['history/states/1-Brandenburg.txt'] = `state = {
	id = 1
	name = "STATE_1"
	manpower = 2500000
	state_category = city
	history = {
		owner = GER
		add_core_of = GER
		victory_points = { 1 20 }
		buildings = {
			infrastructure = 4
			industrial_complex = 3
		}
	}
	provinces = { 1 2 }
}
`
  o['history/states/2-Bayern.txt'] = staat(2, 'STATE_2', 'GER', ['GER'], [3], 3000000, 'large_town')
  o['history/states/3-Bern.txt'] = staat(3, 'STATE_3', 'SWI', ['SWI'], [4], 900000)
  o['history/states/4-Zuerich.txt'] = staat(4, 'STATE_4', 'SWI', ['SWI'], [5], 1200000)
  o['history/states/5-Ile_de_France.txt'] = staat(5, 'STATE_5', 'FRA', ['FRA'], [6], 5000000, 'megalopolis')
  o['history/states/6-Elsass.txt'] = '﻿' + [
    'state = {',
    '\tid = 6',
    '\tname = "STATE_6" # alte Grenze }',
    '\tmanpower = 1100000',
    '\tstate_category = town',
    '\thistory = {',
    '\t\towner = FRA',
    '\t\tadd_core_of = FRA',
    '\t\tadd_core_of = GER',
    '\t\t1939.1.1 = {',
    '\t\t\towner = GER',
    '\t\t}',
    '\t}',
    '\tprovinces = { 7 }',
    '}',
    '',
  ].join('\r\n')
  o['history/states/99-Kaputt.txt'] = 'state = {\n\tname = "STATE_99"\n}\n'

  o['map/definition.csv'] = ['0;0;0;0;land;false;unknown;0',
    ...[1, 2, 3, 4, 5, 6, 7].map(n => `${n};${n * 20};0;0;land;false;plains;1`),
    '8;0;0;200;sea;true;ocean;0', ''].join('\n')
  o['map/provinces.bmp'] = karte()

  o['localisation/german/countries_l_german.yml'] = schreibeYml('german', [
    ['GER', 'Deutschland'], ['GER_DEF', 'Deutschland'], ['GER_ADJ', 'deutsch'],
    ['GER_fascism', 'Deutsches Reich'], ['GER_fascism_DEF', 'das Deutsche Reich'], ['GER_fascism_ADJ', 'deutsch'],
    ['SWI', 'Schweiz'], ['SWI_DEF', 'die Schweiz'], ['SWI_ADJ', 'schweizerisch'],
    ['FRA', 'Frankreich'], ['FRA_DEF', 'Frankreich'], ['FRA_ADJ', 'französisch'],
  ])
  o['localisation/german/state_names_l_german.yml'] = schreibeYml('german', [
    ['STATE_1', 'Brandenburg'], ['STATE_2', 'Bayern'], ['STATE_3', 'Bern'], ['STATE_4', 'Zürich'], ['STATE_5', 'Île-de-France'],
  ])
  o['localisation/english/state_names_l_english.yml'] = schreibeYml('english', [['STATE_6', 'Alsace']])
  o['localisation/german/ideologies_l_german.yml'] = schreibeYml('german', [
    ['democratic', 'Demokratisch'], ['communism', 'Kommunistisch'], ['fascism', 'Faschistisch'], ['neutrality', 'Blockfrei'],
    ['conservatism', 'Konservatismus'], ['liberalism', 'Liberalismus'], ['socialism', 'Sozialismus'],
    ['marxism', 'Marxismus'], ['leninism', 'Leninismus'], ['stalinism', 'Stalinismus'],
    ['nazism', 'Nationalsozialismus'], ['fascism_ideology', 'Faschismus'],
    ['despotism', 'Despotismus'], ['oligarchism', 'Oligarchie'],
    ['SWI_giuseppe_motta', 'Giuseppe Motta'],
  ])

  o['interface/ideas.gfx'] = `spriteTypes = {
	spriteType = {
		name = "GFX_idea_generic_army"
		texturefile = "gfx/interface/ideas/idea_generic_army.dds"
	}
	spriteType = {
		name = "GFX_idea_generic_industry"
		texturefile = "gfx/interface/ideas/idea_generic_industry.dds"
	}
}
`
  o['interface/leaders.gfx'] = `spriteTypes = {
	spriteType = {
		name = "GFX_portrait_GER_adolf_hitler"
		texturefile = "gfx/leaders/GER/Portrait_Germany_Adolf_Hitler.dds"
	}
}
`
  o['gfx/interface/ideas/idea_generic_army.dds'] = schreibeDds(einfarbig(64, 64, [0, 160, 0]), 64, 64)
  o['gfx/interface/ideas/idea_generic_industry.dds'] = schreibeDds(einfarbig(64, 64, [128, 128, 128]), 64, 64)
  o['gfx/leaders/Europe/portrait_europe_generic_1.dds'] = schreibeDds(einfarbig(156, 210, [180, 150, 120]), 156, 210)
  o['gfx/leaders/Europe/portrait_europe_generic_2.dds'] = schreibeDds(einfarbig(156, 210, [120, 150, 180]), 156, 210)
  o['gfx/leaders/GER/Portrait_Germany_Adolf_Hitler.dds'] = schreibeDds(einfarbig(156, 210, [90, 90, 90]), 156, 210)

  o['gfx/flags/GER.tga'] = schreibeTga(einfarbig(82, 52, [75, 75, 75]), 82, 52)
  o['gfx/flags/GER_fascism.tga'] = schreibeTga(einfarbig(82, 52, [20, 20, 20]), 82, 52)
  o['gfx/flags/SWI.tga'] = schreibeTga(einfarbig(82, 52, [200, 30, 30]), 82, 52)
  o['gfx/flags/FRA.tga'] = schreibeTga(einfarbig(82, 52, [57, 57, 195]), 82, 52)
  o['gfx/flags/medium/GER.tga'] = schreibeTga(einfarbig(41, 26, [75, 75, 75]), 41, 26)
  return o
}
