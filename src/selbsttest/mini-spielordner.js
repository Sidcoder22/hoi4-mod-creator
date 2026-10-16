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

// DDS mit DX10-Kopf (z. B. BC7), den der Creator nicht lesen kann
function ddsDx10() {
  const b = new Uint8Array(128 + 20 + 64)
  const dv = new DataView(b.buffer)
  b.set([0x44, 0x44, 0x53, 0x20])
  dv.setUint32(4, 124, true)
  dv.setUint32(12, 4, true)
  dv.setUint32(16, 4, true)
  dv.setUint32(76, 32, true)
  dv.setUint32(80, 0x4, true)
  b.set([0x44, 0x58, 0x31, 0x30], 84)
  return b
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
create_faction = axis_faction
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
if = {
	limit = { has_dlc = "La Resistance" }
	set_technology = {
		tech_support = 1
	}
}
set_politics = {
	ruling_party = democratic
	last_election = "1935.10.27"
	election_frequency = 36
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
set_autonomy = {
	target = SWI
	autonomous_state = autonomy_dominion
}
1939.1.1 = {
	puppet = GER
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
			1 = {
				bunker = 2
			}
		}
		1939.1.1 = {
			buildings = {
				arms_factory = 2
			}
		}
	}
	resources = {
		steel = 12
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
    '\t\tadd_extra_state_shared_building_slots = 1',
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
    ...[1, 2, 3, 4, 5, 6, 7].map(n => `${n};${n * 20};0;0;land;${n === 4 ? 'true' : 'false'};plains;1`),
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

  // Fokus-Symbole (Etappe 2): Schreibweise wie im Spiel mit SpriteType
  o['interface/goals.gfx'] = `spriteTypes = {
	SpriteType = {
		name = "GFX_goal_generic_construct_civ_factory"
		texturefile = "gfx/interface/goals/goal_generic_construct_civ_factory.dds"
	}
	SpriteType = {
		name = "GFX_goal_generic_army_doctrines"
		texturefile = "gfx/interface/goals/goal_generic_army_doctrines.dds"
	}
	SpriteType = {
		name = "GFX_goal_kaputt"
		texturefile = "gfx/interface/goals/goal_kaputt.dds"
	}
}
`
  o['interface/goals_shine.gfx'] = `spriteTypes = {
	SpriteType = {
		name = "GFX_goal_generic_construct_civ_factory_shine"
		texturefile = "gfx/interface/goals/goal_generic_construct_civ_factory.dds"
	}
}
`
  o['gfx/interface/goals/goal_generic_construct_civ_factory.dds'] = schreibeDds(einfarbig(94, 86, [40, 80, 200]), 94, 86)
  o['gfx/interface/goals/goal_generic_army_doctrines.dds'] = schreibeDds(einfarbig(94, 86, [200, 40, 40]), 94, 86)
  o['gfx/interface/goals/goal_kaputt.dds'] = ddsDx10()
  o['common/technology_tags/00_technology.txt'] = 'technology_categories = {\n\tindustry\n\telectronics\n\tland_doctrine\n}\n'
  o['localisation/german/technology_l_german.yml'] = schreibeYml('german', [['industry', 'Industrie'], ['electronics', 'Elektronik'], ['land_doctrine', 'Heeresdoktrin']])

  // Etappe 2b: Geister, Eigenschaften und Autonomiestufen des Spiels
  o['common/ideas/00_ideen.txt'] = `ideas = {
	country = {
		schweizer_neutralitaet = {
			picture = generic_army
			allowed = { original_tag = SWI }
			modifier = {
				consumer_goods_factor = -0.05
				stability_factor = 0.1
			}
			research_bonus = { industry = 0.1 }
		}
		deutsche_industrie = {
			modifier = { industrial_capacity_factory = 0.1 }
		}
	}
	economy = {
		civilian_economy = {
			modifier = { consumer_goods_factor = 0.35 }
		}
	}
}
`
  o['common/country_leader/00_traits.txt'] = `leader_traits = {
	popular_figurehead = {
		random = no
		stability_factor = 0.15
		political_power_factor = -0.1
	}
	war_monger = {
		random = no
		war_support_factor = 0.1
	}
}
`
  o['common/autonomous_states/01_dominion.txt'] = 'autonomy_state = {\n\tid = autonomy_dominion\n\tmin_freedom_level = 0.6\n}\n'
  o['common/autonomous_states/02_puppet.txt'] = 'autonomy_state = {\n\tid = autonomy_puppet\n\tmin_freedom_level = 0.2\n}\n'
  o['localisation/german/etappe2b_l_german.yml'] = schreibeYml('german', [
    ['schweizer_neutralitaet', 'Schweizer Neutralität'], ['schweizer_neutralitaet_desc', 'Wir bleiben draussen.'],
    ['deutsche_industrie', 'Deutsche Industrie'], ['MODIFIER_CONSUMER_GOODS_FACTOR', 'Konsumgüter'], ['stability_factor', 'Stabilität'],
    ['popular_figurehead', 'Volksheld'], ['autonomy_dominion', 'Dominion'], ['autonomy_puppet', 'Marionette'],
  ])

  // Etappe 4c: Technologien (Variablen wie @1918 stehen im Spiel oben in der Datei)
  const tech = (id, jahr, ordner, extra = '') => `\t${id} = {\n\t\tstart_year = ${jahr}\n\t\tresearch_cost = 1.5\n${extra}\t\tfolder = {\n\t\t\tname = ${ordner}\n\t\t\tposition = { x = 0 y = @1918 }\n\t\t}\n\t}\n`
  const weiter = (ziel) => `\t\tpath = {\n\t\t\tleads_to_tech = ${ziel}\n\t\t\tresearch_cost_coeff = 1\n\t\t}\n`
  o['common/technologies/infantry.txt'] = '@1918 = 0\n@1936 = 4\ntechnologies = {\n' +
    tech('infantry_weapons', 1918, 'infantry_folder', weiter('infantry_weapons1')) +
    tech('infantry_weapons1', 1936, 'infantry_folder', weiter('infantry_weapons2')) +
    tech('infantry_weapons2', 1939, 'infantry_folder') +
    tech('tech_support', 1936, 'support_folder') + '}\n'
  o['common/technologies/industry.txt'] = 'technologies = {\n' +
    tech('basic_machine_tools', 1936, 'industry_folder', weiter('improved_machine_tools')) +
    tech('improved_machine_tools', 1940, 'industry_folder') + '}\n'
  o['common/technologies/land_doctrine.txt'] = 'technologies = {\n' + tech('grand_battle_plan', 1936, 'land_doctrine_folder', '\t\tdoctrine = yes\n') + '}\n'
  o['localisation/german/etappe4c_l_german.yml'] = schreibeYml('german', [
    ['infantry_weapons', 'Infanteriewaffen'], ['infantry_weapons1', 'Infanteriewaffen I'], ['infantry_weapons2', 'Infanteriewaffen II'], ['industry_folder', 'Industrie'],
  ])

  // Etappe 4b: Gebaeudearten, Ressourcen, Staatskategorien
  // Format seit 1.12: Grenzen in level_cap, Kueste mit dem Tippfehler des Spiels «only_costal»
  o['common/buildings/00_buildings.txt'] = `buildings = {
	infrastructure = {
		level_cap = {
			state_max = 5
		}
	}
	industrial_complex = {
		level_cap = {
			shares_slots = yes
			group_by = factory
		}
	}
	arms_factory = {
		level_cap = {
			shares_slots = yes
			group_by = factory
		}
	}
	dockyard = {
		level_cap = {
			shares_slots = yes
			group_by = factory
		}
		only_costal = yes
	}
	naval_base = {
		level_cap = {
			province_max = 10
		}
		only_costal = yes
	}
	bunker = {
		level_cap = {
			province_max = 10
		}
	}
	rail_way = {
		level_cap = {
			province_max = 5
		}
	}
}
`
  o['common/resources/00_resources.txt'] = 'resources = {\n\toil = {\n\t\tcic = 0.125\n\t}\n\tsteel = {\n\t\tcic = 0.125\n\t}\n}\n'
  o['common/state_category/00_state_categories.txt'] = 'state_categories = {\n\ttown = { local_building_slots = 4 }\n\tlarge_town = { local_building_slots = 5 }\n\tcity = { local_building_slots = 6 }\n\tmegalopolis = { local_building_slots = 12 }\n}\n'
  o['localisation/german/etappe4b_l_german.yml'] = schreibeYml('german', [
    ['industrial_complex', 'Zivilfabrik'], ['arms_factory', 'Militärfabrik'], ['dockyard', 'Werft'], ['naval_base', 'Marinestützpunkt'],
    ['oil', 'Öl'], ['city', 'Stadt'], ['town', 'Kleinstadt'], ['VICTORY_POINTS_1', 'Berlin'],
  ])

  // Etappe 3: Eventbilder, Entscheidungssymbole und Kategorien
  o['interface/eventpictures.gfx'] = `spriteTypes = {
	spriteType = {
		name = "GFX_report_event_generic_rally"
		texturefile = "gfx/event_pictures/report_event_generic_rally.dds"
	}
	spriteType = {
		name = "GFX_report_event_soldiers_marching"
		texturefile = "gfx/event_pictures/report_event_soldiers_marching.dds"
	}
}
`
  o['interface/decisions.gfx'] = `spriteTypes = {
	SpriteType = {
		name = "GFX_decision_generic_industry"
		texturefile = "gfx/interface/decisions/decision_generic_industry.dds"
	}
	SpriteType = {
		name = "GFX_decision_category_generic_political_actions"
		texturefile = "gfx/interface/decisions/decision_category_generic_political_actions.dds"
	}
}
`
  o['gfx/event_pictures/report_event_generic_rally.dds'] = schreibeDds(einfarbig(210, 176, [150, 120, 70]), 210, 176)
  o['gfx/event_pictures/report_event_soldiers_marching.dds'] = schreibeDds(einfarbig(210, 176, [90, 100, 80]), 210, 176)
  o['gfx/interface/decisions/decision_generic_industry.dds'] = schreibeDds(einfarbig(32, 32, [200, 160, 40]), 32, 32)
  o['gfx/interface/decisions/decision_category_generic_political_actions.dds'] = schreibeDds(einfarbig(32, 32, [60, 90, 160]), 32, 32)
  o['common/decisions/categories/00_decision_categories.txt'] = `political_actions = {
	icon = generic_political_actions
}
economy_decisions = {
	icon = GFX_decision_category_generic_political_actions
	allowed = { always = yes }
}
`
  o['localisation/german/etappe3_l_german.yml'] = schreibeYml('german', [['political_actions', 'Politische Massnahmen'], ['economy_decisions', 'Wirtschaft']])

  o['gfx/flags/GER.tga'] = schreibeTga(einfarbig(82, 52, [75, 75, 75]), 82, 52)
  o['gfx/flags/GER_fascism.tga'] = schreibeTga(einfarbig(82, 52, [20, 20, 20]), 82, 52)
  o['gfx/flags/SWI.tga'] = schreibeTga(einfarbig(82, 52, [200, 30, 30]), 82, 52)
  o['gfx/flags/FRA.tga'] = schreibeTga(einfarbig(82, 52, [57, 57, 195]), 82, 52)
  o['gfx/flags/medium/GER.tga'] = schreibeTga(einfarbig(41, 26, [75, 75, 75]), 41, 26)
  return o
}
