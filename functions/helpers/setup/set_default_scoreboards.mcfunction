# management
scoreboard players set game_data settings.role_assignment.enabled 1
scoreboard players set game_data settings.book_pass.enabled 0
scoreboard players set game_data settings.book_pass.copy_type 1
scoreboard players set game_data settings.role_management.enabled 1
scoreboard players set game_data settings.win_con_management.enabled 1
scoreboard players set game_data settings.win_con_management.tell_roles_after 1

scoreboard players set game_data settings.death_handling.enabled 1
scoreboard players set game_data settings.death_handling.tell_killer 1
scoreboard players set game_data settings.death_handling.tell_killer_role 1
scoreboard players set game_data settings.death_handling.tell_roles 1
scoreboard players set game_data settings.death_handling.tell_who_is_living 1
scoreboard players set game_data settings.death_handling.dead_players_receive_all_chat_messages 1

scoreboard players set game_data settings.extra_mechanics.knockout_mode 0
scoreboard players set game_data settings.extra_mechanics.protection_enabled 0
scoreboard players set game_data settings.extra_mechanics.protection_time 30
scoreboard players set game_data settings.extra_mechanics.protection_duration 30
scoreboard players set game_data settings.extra_mechanics.protection_ends_early 1

scoreboard players set game_data settings.modifiers.modifier_chance 100
# scoreboard players set game_data settings.modifiers.modifier_ability_time 25
scoreboard players set game_data settings.modifiers.max_modifier_count_min 10
scoreboard players set game_data settings.modifiers.max_modifier_count_max 10
scoreboard players set game_data settings.modifiers.murderer_modifier_chance -5
scoreboard players set game_data settings.modifiers.neutral_killer_modifier_chance -5
scoreboard players set game_data settings.modifiers.neutral_independent_modifier_chance -5
scoreboard players set game_data settings.modifiers.innocent_modifier_chance -5

# role draft
scoreboard players set game_data settings.role_draft.enabled 0
scoreboard players set game_data settings.role_draft.can_have_duplicates 0
scoreboard players set game_data settings.role_draft.option_count 2
scoreboard players set game_data settings.role_draft.time_to_choose 10
scoreboard players set game_data settings.role_draft.include_base_roles 0

# role guessing
scoreboard players set game_data settings.role_guessing.enabled 1
scoreboard players set game_data settings.role_guessing.murderer_guess_count 3
scoreboard players set game_data settings.role_guessing.guess_cooldown 120
scoreboard players set game_data settings.role_guessing.can_guess_modifiers 1
scoreboard players set game_data settings.role_guessing.death_on_guess 1

# ghost bodies
scoreboard players set game_data settings.ghost_bodies.enabled 1
scoreboard players set game_data settings.ghost_bodies.visibility 1
scoreboard players set game_data settings.ghost_bodies.dead_players_can_see 1

scoreboard players set game_data settings.sound.builtin_chance 1
scoreboard players set game_data settings.sound.map_chance 0
scoreboard players set game_data settings.sound.custom_chance 0
scoreboard players set game_data settings.sound.song_delay_min 10
scoreboard players set game_data settings.sound.song_delay_max 20
scoreboard players set game_data player.sound.sound_settings 1

# role assignment & tracking
scoreboard players set game_data tracking.murderer_count 0
scoreboard players set game_data tracking.innocent_count 0
scoreboard players set game_data assignment.murderer_count.min 2
scoreboard players set game_data assignment.murderer_count.max 2
scoreboard players set game_data assignment.random_murderers.min 6
scoreboard players set game_data assignment.random_murderers.max 6
scoreboard players set game_data assignment.random_innocents.min 10
scoreboard players set game_data assignment.random_innocents.max 10
scoreboard players set game_data assignment.random_neutral_independents.min 0
scoreboard players set game_data assignment.random_neutral_independents.max 0
scoreboard players set game_data assignment.random_neutral_killers.min 0
scoreboard players set game_data assignment.random_neutral_killers.max 0

# map settings
scoreboard players set game_data settings.map_settings.prevent_pot_interaction 1
scoreboard players set game_data settings.map_settings.prevent_shelves_interaction 1
scoreboard players set game_data settings.map_settings.prevent_bed_interaction 2
scoreboard players set game_data settings.map_settings.prevent_armor_stand_interaction 1
scoreboard players set game_data settings.map_settings.prevent_campfires_interaction 1
scoreboard players set game_data settings.map_settings.prevent_candles_interaction 1
scoreboard players set game_data settings.map_settings.prevent_chisled_bookshelves_interaction 1
scoreboard players set game_data settings.map_settings.prevent_flower_pot_interaction 1
scoreboard players set game_data settings.map_settings.prevent_dragon_egg_interaction 2
scoreboard players set game_data settings.map_settings.prevent_respawn_anchors_interaction 2

# role defaults
scoreboard players set game_data role_settings.murderer.murderer_chat 1
scoreboard players set game_data settings.role_guessing.murderer_guess_type 1

scoreboard players set game_data role_settings.jester.ability_cooldown 45
scoreboard players set game_data role_settings.jester.ability_uses 3
scoreboard players set game_data role_settings.jester.interact_grants_uses 1
scoreboard players set game_data role_settings.jester.max_uses -1
scoreboard players set game_data role_settings.jester.can_see_ghosts 1
scoreboard players set game_data role_settings.jester.can_teleport 1
scoreboard players set game_data role_settings.jester.teleport_delay_time 3
scoreboard players set game_data role_settings.jester.time_to_teleport 10
scoreboard players set game_data role_settings.jester.teleport_time 3
scoreboard players set game_data role_settings.jester.invis_on_teleport 2

scoreboard players set game_data role_settings.detective.names_to_give 3
scoreboard players set game_data role_settings.detective.cooldown_time 30
scoreboard players set game_data role_settings.detective.action_uses -1

scoreboard players set game_data role_settings.soul.guessed_cancels_respawn 1
scoreboard players set game_data role_settings.soul.respawn_time 30
scoreboard players set game_data role_settings.soul.respawn_is_announced 1

scoreboard players set game_data role_settings.serial_killer.target_on_actionbar 1
scoreboard players set game_data role_settings.serial_killer.start_after_first_death 1

scoreboard players set game_data role_settings.officer.camp_cooldown 90
scoreboard players set game_data role_settings.officer.camp_uses -1
scoreboard players set game_data role_settings.officer.camped_death_gives_back_use 0
scoreboard players set game_data role_settings.officer.notify_on_camped_death 0
scoreboard players set game_data role_settings.officer.bullet_damage 6
scoreboard players set game_data role_settings.officer.failed_camp_prevent_camp 0

scoreboard players set game_data role_settings.veteran.alert_cooldown 60
scoreboard players set game_data role_settings.veteran.alert_uses 5
scoreboard players set game_data role_settings.veteran.alert_on_all_interacts 0
scoreboard players set game_data role_settings.veteran.alert_duration 30
scoreboard players set game_data role_settings.veteran.alert_defense_type 2

scoreboard players set game_data role_settings.revealer.mark_charges 5
scoreboard players set game_data role_settings.revealer.mark_cooldown 60
scoreboard players set game_data role_settings.revealer.mark_death_gives_back_charge 0
scoreboard players set game_data role_settings.revealer.reveal_gives_killer_role 1

scoreboard players set game_data role_settings.warden.cooldown_time 90
scoreboard players set game_data role_settings.warden.charges -1
scoreboard players set game_data role_settings.warden.darkness_time 5
scoreboard players set game_data role_settings.warden.strength_amp 0
scoreboard players set game_data role_settings.warden.warden_gets_darkness 0

scoreboard players set game_data role_settings.warlock.ability_cooldown 90
scoreboard players set game_data role_settings.warlock.cast_uses -1
scoreboard players set game_data role_settings.warlock.damage_increase_time 15
scoreboard players set game_data role_settings.warlock.time_for_max_charge 240
scoreboard players set game_data role_settings.warlock.base_extra_damage 0
scoreboard players set game_data role_settings.warlock.damage_per_hit 10

scoreboard players set game_data role_settings.necromancer.summon_count 1
scoreboard players set game_data role_settings.necromancer.summon_delay_after_kill 90
scoreboard players set game_data role_settings.necromancer.delay_reset_type 0
scoreboard players set game_data role_settings.necromancer.notify_on_delay_reset 0
scoreboard players set game_data role_settings.necromancer.summon_has_chat_access 0
scoreboard players set game_data role_settings.necromancer.summon_type 2

scoreboard players set game_data role_settings.doppelganger.copy_cooldown 180
scoreboard players set game_data role_settings.doppelganger.pick_random_player 0
scoreboard players set game_data role_settings.doppelganger.player_is_notified 1

scoreboard players set game_data role_settings.amnesiac.action_uses -1
scoreboard players set game_data role_settings.amnesiac.cooldown_time 30
scoreboard players set game_data role_settings.amnesiac.message_on_player_death 1
scoreboard players set game_data role_settings.amnesiac.line_on_player_death 1
scoreboard players set game_data role_settings.amnesiac.steal_removes_ghost_body 0

scoreboard players set game_data role_settings.trickster.disables_murderer_chat 1
scoreboard players set game_data role_settings.trickster.detect_ability_active_type 2
scoreboard players set game_data role_settings.trickster.detect_shows_radius 1
scoreboard players set game_data role_settings.trickster.detect_shows_marks 1
scoreboard players set game_data role_settings.trickster.detect_ability_cooldown 60
scoreboard players set game_data role_settings.trickster.detect_ability_uses -1
scoreboard players set game_data role_settings.trickster.detect_ability_duration 60

scoreboard players set game_data role_settings.double_agent.murderer_aligned_chance 30
scoreboard players set game_data role_settings.double_agent.innocent_role_count 3
scoreboard players set game_data role_settings.double_agent.murderer_role_count 3
scoreboard players set game_data role_settings.double_agent.gets_murderer_chat_access 1

scoreboard players set game_data role_settings.bodyguard.gets_told_defendee_role 1
scoreboard players set game_data role_settings.bodyguard.killer_chance 20
scoreboard players set game_data role_settings.bodyguard.defendee_told_of_bodyguard 1
scoreboard players set game_data role_settings.bodyguard.failure_role_change 1
scoreboard players set game_data role_settings.bodyguard.protect_cooldown 60
scoreboard players set game_data role_settings.bodyguard.protect_uses 5
scoreboard players set game_data role_settings.bodyguard.protect_duration 10 

scoreboard players set game_data role_settings.tycoon.coin_spawn_frequency 20
scoreboard players set game_data role_settings.tycoon.shop_cooldown 30
scoreboard players set game_data role_settings.tycoon.can_multibuy 0
scoreboard players set game_data role_settings.tycoon.tycoon_kill_gives_effects 1
scoreboard players set game_data role_settings.tycoon.start_with_detect_coin_ability 1
scoreboard players set game_data role_settings.tycoon.detect_coin_cooldown 15
scoreboard players set game_data role_settings.tycoon.coin_starting_value 1
scoreboard players set game_data role_settings.tycoon.big_coin_chance 5
scoreboard players set game_data role_settings.tycoon.value_one_increase 1
scoreboard players set game_data role_settings.tycoon.value_two_increase 2
scoreboard players set game_data role_settings.tycoon.frequency_one_increase 5
scoreboard players set game_data role_settings.tycoon.frequency_two_increase 5
scoreboard players set game_data role_settings.tycoon.big_coin_chance_up_increase 20
scoreboard players set game_data role_settings.tycoon.win_if_alive_by_default 0
scoreboard players set game_data role_settings.tycoon.detect_coins_cost 5
scoreboard players set game_data role_settings.tycoon.coin_value_up_one_cost 5
scoreboard players set game_data role_settings.tycoon.coin_value_up_two_cost 15
scoreboard players set game_data role_settings.tycoon.coin_spawn_freq_up_one_cost 5
scoreboard players set game_data role_settings.tycoon.coin_spawn_freq_up_two_cost 15
scoreboard players set game_data role_settings.tycoon.big_coin_chance_up_cost 10
scoreboard players set game_data role_settings.tycoon.new_coin_line_passive_cost 10
scoreboard players set game_data role_settings.tycoon.super_armor_charge_cost 25
scoreboard players set game_data role_settings.tycoon.win_alive_cost 50
scoreboard players set game_data role_settings.tycoon.bragging_rights_cost 100

scoreboard players set game_data role_settings.sheriff.action_uses -1
scoreboard players set game_data role_settings.sheriff.cooldown_time 60
scoreboard players set game_data role_settings.sheriff.heart_loss 6
scoreboard players set game_data role_settings.sheriff.strength_duration 10

scoreboard players set game_data role_settings.janitor.clean_cooldown 60
scoreboard players set game_data role_settings.janitor.clean_uses -1

scoreboard players set game_data role_settings.ghost_writer.write_cooldown 120
scoreboard players set game_data role_settings.ghost_writer.write_uses -1
scoreboard players set game_data role_settings.ghost_writer.interactive_tasks_on 1
scoreboard players set game_data role_settings.ghost_writer.writing_consumes_ghost 0
scoreboard players set game_data role_settings.ghost_writer.writing_cooldown_resets_on_kill 1

scoreboard players set game_data role_settings.tempest.kill_timer_length 50
scoreboard players set game_data role_settings.tempest.absorption_enabled 1
scoreboard players set game_data role_settings.tempest.absorption_amplifier 0
scoreboard players set game_data role_settings.tempest.absorption_is_per_kill 1
scoreboard players set game_data role_settings.tempest.teleport_enabled 1
scoreboard players set game_data role_settings.tempest.teleport_distance 10
scoreboard players set game_data role_settings.tempest.teleport_cooldown 60
scoreboard players set game_data role_settings.tempest.electricity_cooldown 90
scoreboard players set game_data role_settings.tempest.thorns_enabled 1
scoreboard players set game_data role_settings.tempest.thorns_duration 10
scoreboard players set game_data role_settings.tempest.thorns_damage 1
scoreboard players set game_data role_settings.tempest.tesla_enabled 1
scoreboard players set game_data role_settings.tempest.tesla_duration 10
scoreboard players set game_data role_settings.tempest.tesla_radius 5
scoreboard players set game_data role_settings.tempest.tesla_splash_damage 2

scoreboard players set game_data role_settings.plague_bearer.infect_cooldown 120
scoreboard players set game_data role_settings.plague_bearer.infect_uses 1
scoreboard players set game_data role_settings.plague_bearer.immune_to_infection 1
scoreboard players set game_data role_settings.plague_bearer.interaction_infects 1
scoreboard players set game_data role_settings.plague_bearer.notify_plague_on_interact 0
scoreboard players set game_data role_settings.plague_bearer.can_reinfect_if_no_infection 0
scoreboard players set game_data role_settings.plague_bearer.infection_spread_type 2
scoreboard players set game_data role_settings.plague_bearer.stage_1_time_min 35
scoreboard players set game_data role_settings.plague_bearer.stage_1_time_max 45
scoreboard players set game_data role_settings.plague_bearer.progression_time_min 10
scoreboard players set game_data role_settings.plague_bearer.progression_time_max 20

scoreboard players set game_data role_settings.stalker.mark_cooldown 60
scoreboard players set game_data role_settings.stalker.max_stalk_count -1
scoreboard players set game_data role_settings.stalker.max_targets -1
scoreboard players set game_data role_settings.stalker.stalking_remove_targets 1
scoreboard players set game_data role_settings.stalker.starting_invisibility_duration 0
scoreboard players set game_data role_settings.stalker.before_stalk_duration 15
scoreboard players set game_data role_settings.stalker.stalk_duration 60
scoreboard players set game_data role_settings.stalker.invisibility_action_enabled 1
scoreboard players set game_data role_settings.stalker.invisibility_action_duration 30

scoreboard players set game_data role_settings.shadowmancer.mark_cooldown 90
scoreboard players set game_data role_settings.shadowmancer.max_marked_players -1
scoreboard players set game_data role_settings.shadowmancer.mark_uses -1
# scoreboard players set game_data role_settings.shadowmancer.mark_grants_invis dummy
# scoreboard players set game_data role_settings.shadowmancer.invis_duration dummy
scoreboard players set game_data role_settings.shadowmancer.marked_players_get_darkness 1
scoreboard players set game_data role_settings.shadowmancer.darkness_delay 15
scoreboard players set game_data role_settings.shadowmancer.darkness_duration 15
scoreboard players set game_data role_settings.shadowmancer.penultimate_darkness_delay 5
scoreboard players set game_data role_settings.shadowmancer.message_on_penultimate_player 1

scoreboard players set game_data role_settings.cryomancer.mark_cooldown 60
scoreboard players set game_data role_settings.cryomancer.freeze_cooldown 150
scoreboard players set game_data role_settings.cryomancer.max_marked_players -1
scoreboard players set game_data role_settings.cryomancer.freeze_uses -1
scoreboard players set game_data role_settings.cryomancer.freeze_radius 10
scoreboard players set game_data role_settings.cryomancer.players_free_frozen 1
scoreboard players set game_data role_settings.cryomancer.freezes_camera 1
scoreboard players set game_data role_settings.cryomancer.clears_all_players 1
scoreboard players set game_data role_settings.cryomancer.freeze_timer 15

scoreboard players set game_data role_settings.apothocary.post_mark_cooldown 120
scoreboard players set game_data role_settings.apothocary.post_kill_cooldown 120
scoreboard players set game_data role_settings.apothocary.mark_uses -1
scoreboard players set game_data role_settings.apothocary.line_duration 5

scoreboard players set game_data role_settings.technician.spawn_portal_cooldown 90
scoreboard players set game_data role_settings.technician.ability_uses 4
scoreboard players set game_data role_settings.technician.invisibility_duration 3
scoreboard players set game_data role_settings.technician.who_can_see_portals_default 0
scoreboard players set game_data role_settings.technician.view_change_time 30
scoreboard players set game_data role_settings.technician.who_can_see_portals_overtime 2
scoreboard players set game_data role_settings.technician.seeing_allows_use 0
scoreboard players set game_data role_settings.technician.dead_players_see_portals 1
scoreboard players set game_data role_settings.technician.teleport_cooldown_time 30

scoreboard players set game_data role_settings.bomber.initial_cooldown 120
scoreboard players set game_data role_settings.bomber.takes_reduced_damage 1
scoreboard players set game_data role_settings.bomber.bomb_cooldown 150
scoreboard players set game_data role_settings.bomber.bomb_uses -1
scoreboard players set game_data role_settings.bomber.bombs_hit_through_blocks 0
scoreboard players set game_data role_settings.bomber.ground_bomb_radius 6
scoreboard players set game_data role_settings.bomber.ground_bomb_explosion_time 5
scoreboard players set game_data role_settings.bomber.ground_bomb_damage 10
scoreboard players set game_data role_settings.bomber.ground_bomb_knockback 2
scoreboard players set game_data role_settings.bomber.player_bomb_radius 4
scoreboard players set game_data role_settings.bomber.player_bomb_explosion_time 10
scoreboard players set game_data role_settings.bomber.player_bomb_damage 6
scoreboard players set game_data role_settings.bomber.player_bomb_knockback 1

scoreboard players set game_data role_settings.glitch.hack_cooldown 90
scoreboard players set game_data role_settings.glitch.glitch_cooldown 60
scoreboard players set game_data role_settings.glitch.hack_uses -1
# scoreboard players set game_data role_settings.glitch.glitch_overrides_cooldown 
scoreboard players set game_data role_settings.glitch.hack_forced_cooldown 120

scoreboard players set game_data role_settings.artemis.brand_cooldown 90
scoreboard players set game_data role_settings.artemis.brand_uses -1
scoreboard players set game_data role_settings.artemis.hunter_dying_threshold 2
scoreboard players set game_data role_settings.artemis.can_brand_killers 0
scoreboard players set game_data role_settings.artemis.notify_on_hunter_death 1
scoreboard players set game_data role_settings.artemis.artemis_wins_with_innos 1
scoreboard players set game_data role_settings.artemis.percent_for_artemis_to_win 70

scoreboard players set game_data role_settings.vampire.max_vampire_count 10
scoreboard players set game_data role_settings.vampire.cannot_infect_first 1
scoreboard players set game_data role_settings.vampire.kill_other_vamps_on_alpha_death 1

scoreboard players set game_data role_settings.witch.spell_cooldown 60
scoreboard players set game_data role_settings.witch.spell_uses -1
scoreboard players set game_data role_settings.witch.spell_radius 7
scoreboard players set game_data role_settings.witch.after_placement_cooldown 30
scoreboard players set game_data role_settings.witch.spell_forced_cooldown 120
scoreboard players set game_data role_settings.witch.murderers_see_spell 1

scoreboard players set game_data role_settings.escapist.mark_cooldown 60
scoreboard players set game_data role_settings.escapist.teleport_cooldown 90
scoreboard players set game_data role_settings.escapist.escape_uses -1

scoreboard players set game_data role_settings.swooper.ability_cooldown 90
scoreboard players set game_data role_settings.swooper.ability_uses 3
scoreboard players set game_data role_settings.swooper.invisibility_time 10

scoreboard players set game_data role_settings.assassin.killer_chance 20
scoreboard players set game_data role_settings.assassin.who_is_notified_of_target 0
scoreboard players set game_data role_settings.assassin.failure_role_change 1
scoreboard players set game_data role_settings.assassin.success_alignment_change 1
scoreboard players set game_data role_settings.assassin.random_alignment_evil_chance 50
scoreboard players set game_data role_settings.assassin.assassin_dies_on_early_kill 1

scoreboard players set game_data role_settings.hex.spell_charges 5
scoreboard players set game_data role_settings.hex.cooldown_time 30
scoreboard players set game_data role_settings.hex.spell_effect_time 5
scoreboard players set game_data role_settings.hex.spell_radius 0

scoreboard players set game_data role_settings.vigilante.guess_count 3
scoreboard players set game_data role_settings.vigilante.guess_cooldown 60

scoreboard players set game_data role_settings.investigator.footprint_lifetime 7
scoreboard players set game_data role_settings.investigator.footprint_size 100

scoreboard players set game_data role_settings.survivor.cooldown_time 60
scoreboard players set game_data role_settings.survivor.action_uses 5
scoreboard players set game_data role_settings.survivor.guard_time 5

scoreboard players set game_data role_settings.altruist.initial_cooldown 120
scoreboard players set game_data role_settings.altruist.revive_count 1
scoreboard players set game_data role_settings.altruist.time_until_blocked 60
scoreboard players set game_data role_settings.altruist.can_revive_killers 1
scoreboard players set game_data role_settings.altruist.revives_ghost_bodies 1
scoreboard players set game_data role_settings.altruist.revive_at_death_location 1
scoreboard players set game_data role_settings.altruist.reviving_kills_altruist 0
scoreboard players set game_data role_settings.altruist.revive_delay 7

scoreboard players set game_data role_settings.gravewalker.mark_cooldown 60
scoreboard players set game_data role_settings.gravewalker.teleport_cooldown 90
scoreboard players set game_data role_settings.gravewalker.teleport_uses -1
scoreboard players set game_data role_settings.gravewalker.gets_interact_notifications 1
scoreboard players set game_data role_settings.gravewalker.reveal_interacter_name 0
scoreboard players set game_data role_settings.gravewalker.max_ghosts_marked 4
scoreboard players set game_data role_settings.gravewalker.invis_on_teleport_duration 3

scoreboard players set game_data role_settings.transporter.action_uses 5
scoreboard players set game_data role_settings.transporter.ability_cooldown 60
scoreboard players set game_data role_settings.transporter.transport_delay 5

scoreboard players set game_data role_settings.trapper.trap_placement_cooldown 90
scoreboard players set game_data role_settings.trapper.trap_uses -1
scoreboard players set game_data role_settings.trapper.trap_radius 4
scoreboard players set game_data role_settings.trapper.trap_uptime 90
scoreboard players set game_data role_settings.trapper.time_in_trap_to_catch 0
scoreboard players set game_data role_settings.trapper.trap_interact_type 2
scoreboard players set game_data role_settings.trapper.info_to_give 2

scoreboard players set game_data role_settings.spy.bug_uses -1
scoreboard players set game_data role_settings.spy.bug_cooldown 60
scoreboard players set game_data role_settings.spy.notify_on_interact 1
scoreboard players set game_data role_settings.spy.bug_time 60

scoreboard players set game_data role_settings.tracker.track_count 5
scoreboard players set game_data role_settings.tracker.track_cooldown 60
scoreboard players set game_data role_settings.tracker.player_death_redeems_track 1
scoreboard players set game_data role_settings.tracker.notify_tracker_on_track_redeem 0

scoreboard players set game_data role_settings.medic.mark_cooldown 120
scoreboard players set game_data role_settings.medic.medic_uses 1
scoreboard players set game_data role_settings.medic.death_redeems_medic 0
scoreboard players set game_data role_settings.medic.medic_health 4
scoreboard players set game_data role_settings.medic.who_is_notified_on_consume 2
scoreboard players set game_data role_settings.medic.player_who_is_mediced_notif 1

scoreboard players set game_data role_settings.mystic.point_time 5
scoreboard players set game_data role_settings.mystic.message_on_player_death 1
scoreboard players set game_data role_settings.mystic.draw_line_on_player_death 1

scoreboard players set game_data role_settings.cleric.action_uses 3
scoreboard players set game_data role_settings.cleric.cooldown_time 90
scoreboard players set game_data role_settings.cleric.prevent_interact_time 60
scoreboard players set game_data role_settings.cleric.healed_player_is_notified 0
scoreboard players set game_data role_settings.cleric.instakill_vamps 1

scoreboard players set game_data role_settings.mortician.autopsy_cooldown 90
scoreboard players set game_data role_settings.mortician.autopsy_uses -1
scoreboard players set game_data role_settings.mortician.player_nearby_range 10
scoreboard players set game_data role_settings.mortician.distance_min_time 60
scoreboard players set game_data role_settings.mortician.close_distance_threshold 15
scoreboard players set game_data role_settings.mortician.nearby_distance_threshold 40

scoreboard players set game_data role_settings.medium.meditate_cooldown 90
scoreboard players set game_data role_settings.medium.meditate_uses -1
scoreboard players set game_data role_settings.medium.discussion_time 45
scoreboard players set game_data role_settings.medium.dead_gains_blindness 1

scoreboard players set game_data role_settings.jailor.jail_uses -1
scoreboard players set game_data role_settings.jailor.jail_cooldown 90
scoreboard players set game_data role_settings.jailor.time_before_jail 20
scoreboard players set game_data role_settings.jailor.jail_time 45
scoreboard players set game_data role_settings.jailor.on_fail 1

scoreboard players set game_data role_settings.ghost.action_cooldown 60
scoreboard players set game_data role_settings.ghost.ecto_uses -1
scoreboard players set game_data role_settings.ghost.first_death_invis_time 15
scoreboard players set game_data role_settings.ghost.timer_initial_length 25
scoreboard players set game_data role_settings.ghost.timer_max_time 50
scoreboard players set game_data role_settings.ghost.haunt_timer_boost 120
scoreboard players set game_data role_settings.ghost.haunt_effect_time 20
scoreboard players set game_data role_settings.ghost.haunt_gives_pumpkin 1
scoreboard players set game_data role_settings.ghost.ectoplasm_radius 3
scoreboard players set game_data role_settings.ghost.ecto_slowness_time 5
scoreboard players set game_data role_settings.ghost.blocks_retain_ecto 1
scoreboard players set game_data role_settings.ghost.block_retain_chance 25
scoreboard players set game_data role_settings.ghost.can_reveal_player_locations 1
scoreboard players set game_data role_settings.ghost.reveal_locations_cooldown 20

scoreboard players set game_data modifier_settings.gambler.cooldown 60
scoreboard players set game_data modifier_settings.gambler.even_dice_rolls 0
scoreboard players set game_data modifier_settings.gambler.receive_double_damage_time 30
scoreboard players set game_data modifier_settings.gambler.freeze_duration 5
scoreboard players set game_data modifier_settings.gambler.low_damage_amount 4
scoreboard players set game_data modifier_settings.gambler.low_damage_can_kill 1
scoreboard players set game_data modifier_settings.gambler.block_interaction_duration 45
scoreboard players set game_data modifier_settings.gambler.absorption_level 0
scoreboard players set game_data modifier_settings.gambler.ability_cooldown_reduction 25
scoreboard players set game_data modifier_settings.gambler.weakness_duration 30
scoreboard players set game_data modifier_settings.gambler.slowness_duration 30
scoreboard players set game_data modifier_settings.gambler.nausea_duration 10
scoreboard players set game_data modifier_settings.gambler.resistance_duration 30
scoreboard players set game_data modifier_settings.gambler.strength_duration 30
scoreboard players set game_data modifier_settings.gambler.reveal_innocent_min_players 2

scoreboard players set game_data modifier_settings.repel.cooldown 60
scoreboard players set game_data modifier_settings.repel.radius 4
scoreboard players set game_data modifier_settings.repel.knockback_power 7
scoreboard players set game_data modifier_settings.repel.damage 0

scoreboard players set game_data modifier_settings.sentry.cooldown 90
scoreboard players set game_data modifier_settings.sentry.damage_dealt 15
scoreboard players set game_data modifier_settings.sentry.range 50

scoreboard players set game_data modifier_settings.party_animal.cooldown 90
scoreboard players set game_data modifier_settings.party_animal.uses -1
scoreboard players set game_data modifier_settings.party_animal.cooldown_reduction 50
scoreboard players set game_data modifier_settings.party_animal.min_players 2
scoreboard players set game_data modifier_settings.party_animal.player_radius 6

scoreboard players set game_data modifier_settings.lone_wolf.cooldown 90
scoreboard players set game_data modifier_settings.lone_wolf.uses -1
scoreboard players set game_data modifier_settings.lone_wolf.cooldown_reduction 50
scoreboard players set game_data modifier_settings.lone_wolf.player_radius 12

scoreboard players set game_data modifier_settings.raid_boss.health_amp 0

scoreboard players set game_data modifier_settings.diseased.cooldown_multiplier 150

scoreboard players set game_data modifier_settings.prickly.thorns_chance 20
scoreboard players set game_data modifier_settings.prickly.damage_threshold_for_thorns 2
scoreboard players set game_data modifier_settings.prickly.thorns_damage 1

scoreboard players set game_data modifier_settings.sniper.guess_count 1

scoreboard players set game_data modifier_settings.shout.line_delay 5

scoreboard players set game_data modifier_settings.disperser.disperser_cooldown 120
scoreboard players set game_data modifier_settings.disperser.allow_duplicate_locations 1
scoreboard players set game_data modifier_settings.disperser.remove_disperser_location 1

scoreboard players set game_data modifier_settings.agent.update_frequency_type 2
scoreboard players set game_data modifier_settings.agent.killer_target_chance -5
scoreboard players set game_data modifier_settings.agent.notify_on_death 1
scoreboard players set game_data modifier_settings.agent.notify_on_interactions 1
scoreboard players set game_data modifier_settings.agent.hide_if_close 1
scoreboard players set game_data modifier_settings.agent.line_changes_colors 1
scoreboard players set game_data modifier_settings.agent.line_alpha_start_distance 20
scoreboard players set game_data modifier_settings.agent.alpha_requires_line_of_sight 1

scoreboard players set game_data modifier_settings.radar.update_frequency 4
scoreboard players set game_data modifier_settings.radar.changes_colors 1
scoreboard players set game_data modifier_settings.radar.hide_if_close 1
scoreboard players set game_data modifier_settings.radar.shrinks_very_close 1
scoreboard players set game_data modifier_settings.radar.line_alpha_start_distance 20
scoreboard players set game_data modifier_settings.radar.alpha_requires_line_of_sight 1

scoreboard players set game_data modifier_settings.hacker.cooldown_reduction 25

scoreboard players set game_data modifier_settings.underdog.cooldown_reduction 50

scoreboard players set game_data modifier_settings.lifesteal.heal_amount 4

scoreboard players set game_data modifier_settings.nurse.cooldown 180
scoreboard players set game_data modifier_settings.nurse.health_strength 0
scoreboard players set game_data modifier_settings.nurse.heal_delay 5

scoreboard players set game_data modifier_settings.addict.cooldown 60
scoreboard players set game_data modifier_settings.addict.effect_duration 10
scoreboard players set game_data modifier_settings.addict.nausea_separation_min 90
scoreboard players set game_data modifier_settings.addict.nausea_separation_max 120
scoreboard players set game_data modifier_settings.addict.nausea_duration 10

scoreboard players set game_data modifier_settings.comeback.health_threshold 10
scoreboard players set game_data modifier_settings.comeback.strength_duration 0
scoreboard players set game_data modifier_settings.comeback.strength_amplifier 0

scoreboard players set game_data modifier_settings.shy.detect_y_velocity 1
scoreboard players set game_data modifier_settings.shy.shy_time 5
scoreboard players set game_data modifier_settings.shy.show_particles 1

scoreboard players set game_data modifier_settings.rotting.rot_time 30

scoreboard players set game_data modifier_settings.frosty.slowness_time 20
scoreboard players set game_data modifier_settings.frosty.slowness_amplifier 1
scoreboard players set game_data modifier_settings.frosty.show_particles 0

scoreboard players set game_data modifier_settings.jammer.jam_time 30

scoreboard objectives add world_state dummy
scoreboard players set game_data world_state 1