// Kleiner Mod-Ordner im Format echter Mods (Etappe 4g): ersetzt die Fokusbaeume und benennt Deutschland um.

import { schreibeYml } from '../leser/yml.js'

export const MINI_MOD_NAME = 'Mini-Reich'

export function erstelleMiniMod() {
  const o = {}
  o['descriptor.mod'] = `version="2.0"
tags={
	"Alternative History"
}
name="${MINI_MOD_NAME}"
replace_path="common/national_focus"
supported_version="1.15.*"
remote_file_id="424242"
`
  o['common/national_focus/reich.txt'] = `focus_tree = {
	id = reich_focus
	country = {
		factor = 0
		modifier = {
			add = 10
			tag = GER
		}
	}
	default = no
	focus = {
		id = REICH_start
		icon = GFX_goal_generic_construct_civ_factory
		x = 3
		y = 0
		cost = 10
		completion_reward = {
			add_political_power = 50
		}
	}
	focus = {
		id = REICH_weiter
		icon = GFX_goal_generic_construct_civ_factory
		relative_position_id = REICH_start
		x = 0
		y = 1
		cost = 10
		prerequisite = { focus = REICH_start }
		completion_reward = {
			add_stability = 0.05
		}
	}
}
`
  // Der Name liegt alphabetisch vor countries_l_german.yml des Spiels: Die Mod muss trotzdem gewinnen
  o['localisation/german/00_minireich_l_german.yml'] = schreibeYml('german', [
    ['GER', 'Reich (Mini)'], ['REICH_start', 'Aufbruch'], ['REICH_weiter', 'Weiter so'],
  ])
  return o
}
