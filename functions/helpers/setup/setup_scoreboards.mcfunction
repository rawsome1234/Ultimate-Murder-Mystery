# start lever position
scoreboard objectives add start_lever.set dummy
scoreboard objectives add start_lever.x dummy
scoreboard objectives add start_lever.y dummy
scoreboard objectives add start_lever.z dummy
scoreboard objectives add start_lever.dim dummy

# respawn position
scoreboard objectives add respawn_pos.set dummy
scoreboard objectives add respawn_pos.x dummy
scoreboard objectives add respawn_pos.y dummy
scoreboard objectives add respawn_pos.z dummy
scoreboard objectives add respawn_pos.dim dummy

# weapons chest
scoreboard objectives add weapons_chest.set dummy
scoreboard objectives add weapons_chest.x dummy
scoreboard objectives add weapons_chest.y dummy
scoreboard objectives add weapons_chest.z dummy
scoreboard objectives add weapons_chest.dim dummy

# spectate location
scoreboard objectives add player_spectate.set dummy
scoreboard objectives add player_spectate.x dummy
scoreboard objectives add player_spectate.y dummy
scoreboard objectives add player_spectate.z dummy
scoreboard objectives add player_spectate.dim dummy

# player location
scoreboard objectives add player_play_block.set dummy
scoreboard objectives add player_play_block.x dummy
scoreboard objectives add player_play_block.y dummy
scoreboard objectives add player_play_block.z dummy
scoreboard objectives add player_play_block.dim dummy

# dispenser button reset position
scoreboard objectives add reset_dispenser_button.set dummy
scoreboard objectives add reset_dispenser_button.x dummy
scoreboard objectives add reset_dispenser_button.y dummy
scoreboard objectives add reset_dispenser_button.z dummy
scoreboard objectives add reset_dispenser_button.dim dummy

# book dispenser position
scoreboard objectives add book_dispenser.set dummy
scoreboard objectives add book_dispenser.x dummy
scoreboard objectives add book_dispenser.y dummy
scoreboard objectives add book_dispenser.z dummy
scoreboard objectives add book_dispenser.dim dummy
scoreboard objectives add book_dispenser.books dummy

# book hopper position
scoreboard objectives add book_hopper.set dummy
scoreboard objectives add book_hopper.x dummy
scoreboard objectives add book_hopper.y dummy
scoreboard objectives add book_hopper.z dummy
scoreboard objectives add book_hopper.dim dummy

# management settings
scoreboard objectives add settings.role_assignment.enabled dummy
scoreboard objectives add settings.book_pass.enabled dummy
scoreboard objectives add settings.book_pass.copy_type dummy
scoreboard objectives add settings.role_management.enabled dummy

scoreboard objectives add settings.win_con_management.enabled dummy
scoreboard objectives add settings.win_con_management.tell_roles_after dummy

# death management
scoreboard objectives add settings.death_handling.enabled dummy
scoreboard objectives add settings.death_handling.tell_who_is_living dummy
scoreboard objectives add settings.death_handling.tell_killer dummy
scoreboard objectives add settings.death_handling.tell_killer_role dummy
scoreboard objectives add settings.death_handling.tell_roles dummy
scoreboard objectives add settings.death_handling.dead_players_receive_all_chat_messages dummy

# extra mechanics
scoreboard objectives add settings.extra_mechanics.knockout_mode dummy
scoreboard objectives add settings.extra_mechanics.protection_enabled dummy
scoreboard objectives add settings.extra_mechanics.protection_time dummy
scoreboard objectives add settings.extra_mechanics.protection_duration dummy
scoreboard objectives add settings.extra_mechanics.protection_ends_early dummy

scoreboard objectives add settings.modifiers.enabled dummy
scoreboard objectives add settings.modifiers.modifier_chance dummy
# scoreboard objectives add settings.modifiers.modifier_ability_time dummy
scoreboard objectives add settings.modifiers.max_modifier_count_min dummy
scoreboard objectives add settings.modifiers.max_modifier_count_max dummy
scoreboard objectives add settings.modifiers.murderer_modifier_chance dummy
scoreboard objectives add settings.modifiers.neutral_killer_modifier_chance dummy
scoreboard objectives add settings.modifiers.neutral_independent_modifier_chance dummy
scoreboard objectives add settings.modifiers.innocent_modifier_chance dummy

# scoreboard objectives add settings.map_settings.control_nametags dummy
# scoreboard objectives add settings.map_settings.prevent_break_paintings dummy
scoreboard objectives add settings.map_settings.prevent_pot_interaction dummy
scoreboard objectives add settings.map_settings.prevent_shelves_interaction dummy
scoreboard objectives add settings.map_settings.prevent_bed_interaction dummy
scoreboard objectives add settings.map_settings.prevent_armor_stand_interaction dummy
scoreboard objectives add settings.map_settings.prevent_campfires_interaction dummy
scoreboard objectives add settings.map_settings.prevent_chisled_bookshelves_interaction dummy
scoreboard objectives add settings.map_settings.prevent_flower_pot_interaction dummy
scoreboard objectives add settings.map_settings.prevent_dragon_egg_interaction dummy
scoreboard objectives add settings.map_settings.prevent_respawn_anchors_interaction dummy
scoreboard objectives add settings.map_settings.prevent_candles_interaction dummy

# MECHANICAL SETTINGS
# Role Draft
scoreboard objectives add settings.role_draft.enabled dummy
scoreboard objectives add settings.role_draft.can_have_duplicates dummy
scoreboard objectives add settings.role_draft.option_count dummy
scoreboard objectives add settings.role_draft.time_to_choose dummy
scoreboard objectives add settings.role_draft.include_base_roles dummy

# Role Guessing
scoreboard objectives add settings.role_guessing.enabled dummy
scoreboard objectives add settings.role_guessing.murderer_guess_count dummy
scoreboard objectives add settings.role_guessing.murderer_guess_type dummy
scoreboard objectives add settings.role_guessing.guess_cooldown dummy
scoreboard objectives add settings.role_guessing.can_guess_modifiers dummy
scoreboard objectives add settings.role_guessing.death_on_guess dummy

# ghost bodies
scoreboard objectives add settings.ghost_bodies.enabled dummy
scoreboard objectives add settings.ghost_bodies.visibility dummy
scoreboard objectives add settings.ghost_bodies.dead_players_can_see dummy

# sound manager
scoreboard objectives add settings.sound.builtin_chance dummy
scoreboard objectives add settings.sound.map_chance dummy
scoreboard objectives add settings.sound.custom_chance dummy
scoreboard objectives add settings.sound.song_delay_min dummy
scoreboard objectives add settings.sound.song_delay_max dummy

# tracking
scoreboard objectives add tracking.murderer_count dummy
scoreboard objectives add tracking.neutral_killer_count dummy
scoreboard objectives add tracking.neutral_innocent_count dummy
scoreboard objectives add tracking.innocent_count dummy
scoreboard objectives add tracking.dead_count dummy
scoreboard objectives add tracking.game_state dummy
scoreboard objectives add tracking.game_length dummy
scoreboard objectives add tracking.book_pass_used dummy
scoreboard objectives add tracking.next_chat_channel dummy
scoreboard objectives add tracking.has_murderer_died dummy
scoreboard objectives add tracking.has_anyone_died dummy

# assignment settings
scoreboard objectives add assignment.murderer_count.min dummy
scoreboard objectives add assignment.murderer_count.max dummy
scoreboard objectives add assignment.random_murderers.min dummy
scoreboard objectives add assignment.random_murderers.max dummy
scoreboard objectives add assignment.random_innocents.min dummy
scoreboard objectives add assignment.random_innocents.max dummy
scoreboard objectives add assignment.random_neutral_independents.min dummy
scoreboard objectives add assignment.random_neutral_independents.max dummy
scoreboard objectives add assignment.random_neutral_killers.min dummy
scoreboard objectives add assignment.random_neutral_killers.max dummy

# ROLE SETTINGS
# scoreboard objectives add role_settings.murderer.guess_count dummy
scoreboard objectives add role_settings.murderer.murderer_chat dummy

scoreboard objectives add role_settings.jester.enabled dummy
scoreboard objectives add role_settings.jester.ability_cooldown dummy
scoreboard objectives add role_settings.jester.ability_uses dummy
scoreboard objectives add role_settings.jester.interact_grants_uses dummy
scoreboard objectives add role_settings.jester.max_uses dummy
scoreboard objectives add role_settings.jester.can_see_ghosts dummy
scoreboard objectives add role_settings.jester.can_teleport dummy
scoreboard objectives add role_settings.jester.teleport_delay_time dummy
scoreboard objectives add role_settings.jester.time_to_teleport dummy
scoreboard objectives add role_settings.jester.teleport_time dummy
scoreboard objectives add role_settings.jester.invis_on_teleport dummy

scoreboard objectives add role_settings.detective.enabled dummy
scoreboard objectives add role_settings.detective.names_to_give dummy
scoreboard objectives add role_settings.detective.cooldown_time dummy
scoreboard objectives add role_settings.detective.action_uses dummy

scoreboard objectives add role_settings.necromancer.enabled dummy
scoreboard objectives add role_settings.necromancer.summon_count dummy
scoreboard objectives add role_settings.necromancer.summon_delay_after_kill dummy
scoreboard objectives add role_settings.necromancer.summon_type dummy
scoreboard objectives add role_settings.necromancer.delay_reset_type dummy
scoreboard objectives add role_settings.necromancer.notify_on_delay_reset dummy
scoreboard objectives add role_settings.necromancer.summon_has_chat_access dummy
scoreboard objectives add role_settings.necromancer.summon_clears_ghost dummy

scoreboard objectives add role_settings.ghost_writer.enabled dummy
scoreboard objectives add role_settings.ghost_writer.write_cooldown dummy
scoreboard objectives add role_settings.ghost_writer.write_uses dummy
scoreboard objectives add role_settings.ghost_writer.interactive_tasks_on dummy
scoreboard objectives add role_settings.ghost_writer.writing_consumes_ghost dummy
scoreboard objectives add role_settings.ghost_writer.writing_cooldown_resets_on_kill dummy

scoreboard objectives add role_settings.janitor.enabled dummy
scoreboard objectives add role_settings.janitor.clean_cooldown dummy
scoreboard objectives add role_settings.janitor.clean_uses dummy

scoreboard objectives add role_settings.tempest.enabled dummy
scoreboard objectives add role_settings.tempest.kill_timer_length dummy
scoreboard objectives add role_settings.tempest.absorption_enabled dummy
scoreboard objectives add role_settings.tempest.absorption_amplifier dummy
scoreboard objectives add role_settings.tempest.absorption_is_per_kill dummy
scoreboard objectives add role_settings.tempest.teleport_enabled dummy
scoreboard objectives add role_settings.tempest.teleport_distance dummy
scoreboard objectives add role_settings.tempest.teleport_cooldown dummy
scoreboard objectives add role_settings.tempest.electricity_cooldown dummy
scoreboard objectives add role_settings.tempest.thorns_enabled dummy
scoreboard objectives add role_settings.tempest.thorns_duration dummy
scoreboard objectives add role_settings.tempest.thorns_damage dummy
scoreboard objectives add role_settings.tempest.tesla_enabled dummy
scoreboard objectives add role_settings.tempest.tesla_duration dummy
scoreboard objectives add role_settings.tempest.tesla_radius dummy
scoreboard objectives add role_settings.tempest.tesla_splash_damage dummy
scoreboard objectives add role_settings.tempest.hide_and_seek dummy

scoreboard objectives add role_settings.plague_bearer.enabled dummy
scoreboard objectives add role_settings.plague_bearer.infect_cooldown dummy
scoreboard objectives add role_settings.plague_bearer.infect_uses dummy
scoreboard objectives add role_settings.plague_bearer.immune_to_infection dummy
scoreboard objectives add role_settings.plague_bearer.interaction_infects dummy
scoreboard objectives add role_settings.plague_bearer.notify_plague_on_interact dummy
scoreboard objectives add role_settings.plague_bearer.can_reinfect_if_no_infection dummy
scoreboard objectives add role_settings.plague_bearer.infection_spread_type dummy
scoreboard objectives add role_settings.plague_bearer.stage_1_time_min dummy
scoreboard objectives add role_settings.plague_bearer.stage_1_time_max dummy
scoreboard objectives add role_settings.plague_bearer.progression_time_min dummy
scoreboard objectives add role_settings.plague_bearer.progression_time_max dummy

scoreboard objectives add role_settings.stalker.enabled dummy
scoreboard objectives add role_settings.stalker.mark_cooldown dummy
scoreboard objectives add role_settings.stalker.max_stalk_count dummy
scoreboard objectives add role_settings.stalker.max_targets dummy
scoreboard objectives add role_settings.stalker.stalking_remove_targets dummy
scoreboard objectives add role_settings.stalker.starting_invisibility_duration dummy
scoreboard objectives add role_settings.stalker.before_stalk_duration dummy
scoreboard objectives add role_settings.stalker.stalk_duration dummy
scoreboard objectives add role_settings.stalker.invisibility_action_enabled dummy
scoreboard objectives add role_settings.stalker.invisibility_action_duration dummy

scoreboard objectives add role_settings.shadowmancer.enabled dummy
scoreboard objectives add role_settings.shadowmancer.mark_cooldown dummy
scoreboard objectives add role_settings.shadowmancer.max_marked_players dummy
scoreboard objectives add role_settings.shadowmancer.mark_uses dummy
# scoreboard objectives add role_settings.shadowmancer.mark_grants_invis dummy
# scoreboard objectives add role_settings.shadowmancer.invis_duration dummy
scoreboard objectives add role_settings.shadowmancer.marked_players_get_darkness dummy
scoreboard objectives add role_settings.shadowmancer.darkness_delay dummy
scoreboard objectives add role_settings.shadowmancer.darkness_duration dummy
scoreboard objectives add role_settings.shadowmancer.penultimate_darkness_delay dummy
scoreboard objectives add role_settings.shadowmancer.message_on_penultimate_player dummy

scoreboard objectives add role_settings.cryomancer.enabled dummy
scoreboard objectives add role_settings.cryomancer.mark_cooldown dummy
scoreboard objectives add role_settings.cryomancer.freeze_cooldown dummy
scoreboard objectives add role_settings.cryomancer.max_marked_players dummy
scoreboard objectives add role_settings.cryomancer.freeze_uses dummy
scoreboard objectives add role_settings.cryomancer.freeze_radius dummy
scoreboard objectives add role_settings.cryomancer.players_free_frozen dummy
scoreboard objectives add role_settings.cryomancer.freezes_camera dummy
scoreboard objectives add role_settings.cryomancer.clears_all_players dummy
scoreboard objectives add role_settings.cryomancer.freeze_timer dummy

scoreboard objectives add role_settings.apothocary.enabled dummy
scoreboard objectives add role_settings.apothocary.post_mark_cooldown dummy
scoreboard objectives add role_settings.apothocary.post_kill_cooldown dummy
scoreboard objectives add role_settings.apothocary.mark_uses dummy
scoreboard objectives add role_settings.apothocary.line_duration dummy

scoreboard objectives add role_settings.technician.enabled dummy
scoreboard objectives add role_settings.technician.spawn_portal_cooldown dummy
scoreboard objectives add role_settings.technician.ability_uses dummy
scoreboard objectives add role_settings.technician.invisibility_duration dummy
scoreboard objectives add role_settings.technician.who_can_see_portals_default dummy
scoreboard objectives add role_settings.technician.view_change_time dummy
scoreboard objectives add role_settings.technician.who_can_see_portals_overtime dummy
scoreboard objectives add role_settings.technician.dead_players_see_portals dummy
scoreboard objectives add role_settings.technician.seeing_allows_use dummy
scoreboard objectives add role_settings.technician.teleport_cooldown_time dummy

scoreboard objectives add role_settings.escapist.enabled dummy
scoreboard objectives add role_settings.escapist.mark_cooldown dummy
scoreboard objectives add role_settings.escapist.teleport_cooldown dummy
scoreboard objectives add role_settings.escapist.escape_uses dummy

scoreboard objectives add role_settings.swooper.enabled dummy
scoreboard objectives add role_settings.swooper.ability_cooldown dummy
scoreboard objectives add role_settings.swooper.ability_uses dummy
scoreboard objectives add role_settings.swooper.invisibility_time dummy

scoreboard objectives add role_settings.warden.enabled dummy
scoreboard objectives add role_settings.warden.cooldown_time dummy
scoreboard objectives add role_settings.warden.charges dummy
scoreboard objectives add role_settings.warden.darkness_time dummy
scoreboard objectives add role_settings.warden.strength_amp dummy
scoreboard objectives add role_settings.warden.warden_gets_darkness dummy

scoreboard objectives add role_settings.officer.enabled dummy
scoreboard objectives add role_settings.officer.camp_cooldown dummy
scoreboard objectives add role_settings.officer.camp_uses dummy
scoreboard objectives add role_settings.officer.camped_death_gives_back_use dummy
scoreboard objectives add role_settings.officer.notify_on_camped_death dummy
scoreboard objectives add role_settings.officer.bullet_damage dummy
scoreboard objectives add role_settings.officer.failed_camp_prevent_camp dummy

scoreboard objectives add role_settings.revealer.enabled dummy
scoreboard objectives add role_settings.revealer.mark_charges dummy
scoreboard objectives add role_settings.revealer.mark_cooldown dummy
scoreboard objectives add role_settings.revealer.mark_death_gives_back_charge dummy
scoreboard objectives add role_settings.revealer.reveal_gives_killer_role dummy

scoreboard objectives add role_settings.veteran.enabled dummy
scoreboard objectives add role_settings.veteran.alert_cooldown dummy
scoreboard objectives add role_settings.veteran.alert_uses dummy
scoreboard objectives add role_settings.veteran.alert_on_all_interacts dummy
scoreboard objectives add role_settings.veteran.alert_duration dummy
scoreboard objectives add role_settings.veteran.alert_defense_type dummy

scoreboard objectives add role_settings.vigilante.enabled dummy
scoreboard objectives add role_settings.vigilante.guess_count dummy
scoreboard objectives add role_settings.vigilante.guess_cooldown dummy

scoreboard objectives add role_settings.trickster.enabled dummy
scoreboard objectives add role_settings.trickster.disables_murderer_chat dummy
scoreboard objectives add role_settings.trickster.detect_ability_active_type dummy
scoreboard objectives add role_settings.trickster.detect_shows_radius dummy
scoreboard objectives add role_settings.trickster.detect_shows_marks dummy
scoreboard objectives add role_settings.trickster.detect_ability_cooldown dummy
scoreboard objectives add role_settings.trickster.detect_ability_uses dummy
scoreboard objectives add role_settings.trickster.detect_ability_duration dummy

scoreboard objectives add role_settings.survivor.enabled dummy
scoreboard objectives add role_settings.survivor.cooldown_time dummy
scoreboard objectives add role_settings.survivor.action_uses dummy
scoreboard objectives add role_settings.survivor.guard_time dummy

scoreboard objectives add role_settings.investigator.enabled dummy
scoreboard objectives add role_settings.investigator.footprint_lifetime dummy
scoreboard objectives add role_settings.investigator.footprint_size dummy

scoreboard objectives add role_settings.double_agent.enabled dummy
scoreboard objectives add role_settings.double_agent.murderer_aligned_chance dummy
scoreboard objectives add role_settings.double_agent.innocent_role_count dummy
scoreboard objectives add role_settings.double_agent.murderer_role_count dummy
scoreboard objectives add role_settings.double_agent.gets_murderer_chat_access dummy

scoreboard objectives add role_settings.gravewalker.enabled dummy
scoreboard objectives add role_settings.gravewalker.mark_cooldown dummy
scoreboard objectives add role_settings.gravewalker.teleport_cooldown dummy
scoreboard objectives add role_settings.gravewalker.teleport_uses dummy
scoreboard objectives add role_settings.gravewalker.gets_interact_notifications dummy
scoreboard objectives add role_settings.gravewalker.reveal_interacter_name dummy
scoreboard objectives add role_settings.gravewalker.max_ghosts_marked dummy
scoreboard objectives add role_settings.gravewalker.invis_on_teleport_duration dummy

scoreboard objectives add role_settings.transporter.enabled dummy
scoreboard objectives add role_settings.transporter.action_uses dummy
scoreboard objectives add role_settings.transporter.ability_cooldown dummy
scoreboard objectives add role_settings.transporter.transport_delay dummy

scoreboard objectives add role_settings.trapper.enabled dummy
scoreboard objectives add role_settings.trapper.trap_placement_cooldown dummy
scoreboard objectives add role_settings.trapper.trap_uses dummy
scoreboard objectives add role_settings.trapper.trap_radius dummy
scoreboard objectives add role_settings.trapper.trap_uptime dummy
scoreboard objectives add role_settings.trapper.time_in_trap_to_catch dummy
scoreboard objectives add role_settings.trapper.trap_interact_type dummy
scoreboard objectives add role_settings.trapper.info_to_give dummy

scoreboard objectives add role_settings.spy.enabled dummy
scoreboard objectives add role_settings.spy.bug_uses dummy
scoreboard objectives add role_settings.spy.bug_cooldown dummy
scoreboard objectives add role_settings.spy.notify_on_interact dummy
scoreboard objectives add role_settings.spy.bug_time dummy

scoreboard objectives add role_settings.tracker.enabled dummy
scoreboard objectives add role_settings.tracker.track_count dummy
scoreboard objectives add role_settings.tracker.track_cooldown dummy
scoreboard objectives add role_settings.tracker.player_death_redeems_track dummy
scoreboard objectives add role_settings.tracker.notify_tracker_on_track_redeem dummy

scoreboard objectives add role_settings.assassin.enabled dummy
scoreboard objectives add role_settings.assassin.killer_chance dummy
scoreboard objectives add role_settings.assassin.who_is_notified_of_target dummy
scoreboard objectives add role_settings.assassin.failure_role_change dummy
scoreboard objectives add role_settings.assassin.assassin_dies_on_early_kill dummy
scoreboard objectives add role_settings.assassin.success_alignment_change dummy
scoreboard objectives add role_settings.assassin.random_alignment_evil_chance dummy

scoreboard objectives add role_settings.bodyguard.enabled dummy
scoreboard objectives add role_settings.bodyguard.gets_told_defendee_role dummy
scoreboard objectives add role_settings.bodyguard.killer_chance dummy
scoreboard objectives add role_settings.bodyguard.defendee_told_of_bodyguard dummy
scoreboard objectives add role_settings.bodyguard.failure_role_change dummy
scoreboard objectives add role_settings.bodyguard.protect_cooldown dummy
scoreboard objectives add role_settings.bodyguard.protect_uses dummy
scoreboard objectives add role_settings.bodyguard.protect_duration dummy

scoreboard objectives add role_settings.tycoon.enabled dummy
scoreboard objectives add role_settings.tycoon.coin_spawn_frequency dummy
scoreboard objectives add role_settings.tycoon.shop_cooldown dummy
scoreboard objectives add role_settings.tycoon.can_multibuy dummy
scoreboard objectives add role_settings.tycoon.tycoon_kill_gives_effects dummy
scoreboard objectives add role_settings.tycoon.start_with_detect_coin_ability dummy
scoreboard objectives add role_settings.tycoon.detect_coin_cooldown dummy
scoreboard objectives add role_settings.tycoon.coin_starting_value dummy
scoreboard objectives add role_settings.tycoon.big_coin_chance dummy
scoreboard objectives add role_settings.tycoon.value_one_increase dummy
scoreboard objectives add role_settings.tycoon.value_two_increase dummy
scoreboard objectives add role_settings.tycoon.frequency_one_increase dummy
scoreboard objectives add role_settings.tycoon.frequency_two_increase dummy
scoreboard objectives add role_settings.tycoon.big_coin_chance_up_increase dummy
scoreboard objectives add role_settings.tycoon.win_if_alive_by_default dummy
scoreboard objectives add role_settings.tycoon.detect_coins_cost dummy
scoreboard objectives add role_settings.tycoon.coin_value_up_one_cost dummy
scoreboard objectives add role_settings.tycoon.coin_value_up_two_cost dummy
scoreboard objectives add role_settings.tycoon.coin_spawn_freq_up_one_cost dummy
scoreboard objectives add role_settings.tycoon.coin_spawn_freq_up_two_cost dummy
scoreboard objectives add role_settings.tycoon.big_coin_chance_up_cost dummy
scoreboard objectives add role_settings.tycoon.new_coin_line_passive_cost dummy
scoreboard objectives add role_settings.tycoon.super_armor_charge_cost dummy
scoreboard objectives add role_settings.tycoon.win_alive_cost dummy
scoreboard objectives add role_settings.tycoon.bragging_rights_cost dummy

scoreboard objectives add role_settings.altruist.enabled dummy
scoreboard objectives add role_settings.altruist.initial_cooldown dummy
scoreboard objectives add role_settings.altruist.revive_count dummy
scoreboard objectives add role_settings.altruist.time_until_blocked dummy
scoreboard objectives add role_settings.altruist.can_revive_killers dummy
scoreboard objectives add role_settings.altruist.revives_ghost_bodies dummy
scoreboard objectives add role_settings.altruist.revive_at_death_location dummy
scoreboard objectives add role_settings.altruist.reviving_kills_altruist dummy
scoreboard objectives add role_settings.altruist.revive_delay dummy

scoreboard objectives add role_settings.doppelganger.enabled dummy
scoreboard objectives add role_settings.doppelganger.copy_cooldown dummy
scoreboard objectives add role_settings.doppelganger.pick_random_player dummy
scoreboard objectives add role_settings.doppelganger.player_is_notified dummy

scoreboard objectives add role_settings.amnesiac.enabled dummy
scoreboard objectives add role_settings.amnesiac.action_uses dummy
scoreboard objectives add role_settings.amnesiac.cooldown_time dummy
scoreboard objectives add role_settings.amnesiac.message_on_player_death dummy
scoreboard objectives add role_settings.amnesiac.line_on_player_death dummy
scoreboard objectives add role_settings.amnesiac.steal_removes_ghost_body dummy

scoreboard objectives add role_settings.sheriff.enabled dummy
scoreboard objectives add role_settings.sheriff.action_uses dummy
scoreboard objectives add role_settings.sheriff.cooldown_time dummy
scoreboard objectives add role_settings.sheriff.heart_loss dummy
scoreboard objectives add role_settings.sheriff.ability_can_self_kill dummy
scoreboard objectives add role_settings.sheriff.strength_amp dummy
scoreboard objectives add role_settings.sheriff.strength_duration dummy

scoreboard objectives add role_settings.hex.enabled dummy
scoreboard objectives add role_settings.hex.spell_charges dummy
scoreboard objectives add role_settings.hex.cooldown_time dummy
scoreboard objectives add role_settings.hex.spell_effect_time dummy
scoreboard objectives add role_settings.hex.spell_radius dummy

scoreboard objectives add role_settings.witch.enabled dummy
scoreboard objectives add role_settings.witch.spell_cooldown dummy
scoreboard objectives add role_settings.witch.spell_uses dummy
scoreboard objectives add role_settings.witch.spell_radius dummy
scoreboard objectives add role_settings.witch.after_placement_cooldown dummy
scoreboard objectives add role_settings.witch.spell_forced_cooldown dummy
scoreboard objectives add role_settings.witch.murderers_see_spell dummy

scoreboard objectives add role_settings.artemis.enabled dummy
scoreboard objectives add role_settings.artemis.brand_cooldown dummy
scoreboard objectives add role_settings.artemis.brand_uses dummy
scoreboard objectives add role_settings.artemis.hunter_dying_threshold dummy
scoreboard objectives add role_settings.artemis.can_brand_killers dummy
scoreboard objectives add role_settings.artemis.notify_on_hunter_death dummy
scoreboard objectives add role_settings.artemis.artemis_wins_with_innos dummy
scoreboard objectives add role_settings.artemis.percent_for_artemis_to_win dummy

scoreboard objectives add role_settings.vampire.enabled dummy
scoreboard objectives add role_settings.vampire.max_vampire_count dummy
scoreboard objectives add role_settings.vampire.cannot_infect_first dummy
scoreboard objectives add role_settings.vampire.chat_id dummy
scoreboard objectives add role_settings.vampire.kill_other_vamps_on_alpha_death dummy

scoreboard objectives add role_settings.mystic.enabled dummy
scoreboard objectives add role_settings.mystic.point_time dummy
scoreboard objectives add role_settings.mystic.message_on_player_death dummy
scoreboard objectives add role_settings.mystic.draw_line_on_player_death dummy

scoreboard objectives add role_settings.bomber.enabled dummy
scoreboard objectives add role_settings.bomber.initial_cooldown dummy
scoreboard objectives add role_settings.bomber.takes_reduced_damage dummy
scoreboard objectives add role_settings.bomber.bomb_cooldown dummy
scoreboard objectives add role_settings.bomber.bomb_uses dummy
scoreboard objectives add role_settings.bomber.bombs_hit_through_blocks dummy
scoreboard objectives add role_settings.bomber.ground_bomb_radius dummy
scoreboard objectives add role_settings.bomber.ground_bomb_explosion_time dummy
scoreboard objectives add role_settings.bomber.ground_bomb_damage dummy
scoreboard objectives add role_settings.bomber.ground_bomb_knockback dummy
scoreboard objectives add role_settings.bomber.player_bomb_radius dummy
scoreboard objectives add role_settings.bomber.player_bomb_explosion_time dummy
scoreboard objectives add role_settings.bomber.player_bomb_damage dummy
scoreboard objectives add role_settings.bomber.player_bomb_knockback dummy

scoreboard objectives add role_settings.glitch.enabled dummy
scoreboard objectives add role_settings.glitch.hack_cooldown dummy
scoreboard objectives add role_settings.glitch.glitch_cooldown dummy
scoreboard objectives add role_settings.glitch.hack_uses dummy
scoreboard objectives add role_settings.glitch.glitch_overrides_cooldown dummy
scoreboard objectives add role_settings.glitch.hack_forced_cooldown dummy

scoreboard objectives add role_settings.cleric.enabled dummy
scoreboard objectives add role_settings.cleric.action_uses dummy
scoreboard objectives add role_settings.cleric.cooldown_time dummy
scoreboard objectives add role_settings.cleric.prevent_interact_time dummy
scoreboard objectives add role_settings.cleric.healed_player_is_notified dummy
scoreboard objectives add role_settings.cleric.instakill_vamps dummy

scoreboard objectives add role_settings.medic.enabled dummy
scoreboard objectives add role_settings.medic.mark_cooldown dummy
scoreboard objectives add role_settings.medic.medic_uses dummy
scoreboard objectives add role_settings.medic.death_redeems_medic dummy
scoreboard objectives add role_settings.medic.medic_health dummy
scoreboard objectives add role_settings.medic.who_is_notified_on_consume dummy
scoreboard objectives add role_settings.medic.player_who_is_mediced_notif dummy

scoreboard objectives add role_settings.mortician.enabled dummy
scoreboard objectives add role_settings.mortician.autopsy_cooldown dummy
scoreboard objectives add role_settings.mortician.autopsy_uses dummy
scoreboard objectives add role_settings.mortician.player_nearby_range dummy
scoreboard objectives add role_settings.mortician.distance_min_time dummy
scoreboard objectives add role_settings.mortician.close_distance_threshold dummy
scoreboard objectives add role_settings.mortician.nearby_distance_threshold dummy

scoreboard objectives add role_settings.medium.enabled dummy
scoreboard objectives add role_settings.medium.meditate_cooldown dummy
scoreboard objectives add role_settings.medium.meditate_uses dummy
scoreboard objectives add role_settings.medium.discussion_time dummy
scoreboard objectives add role_settings.medium.dead_gains_blindness dummy

scoreboard objectives add role_settings.jailor.enabled dummy
scoreboard objectives add role_settings.jailor.jail_uses dummy
scoreboard objectives add role_settings.jailor.jail_cooldown dummy
scoreboard objectives add role_settings.jailor.time_before_jail dummy
scoreboard objectives add role_settings.jailor.jail_time dummy
scoreboard objectives add role_settings.jailor.on_fail dummy
scoreboard objectives add role_settings.jailor.send_timer_messages dummy

scoreboard objectives add role_settings.ghost.enabled dummy
scoreboard objectives add role_settings.ghost.action_cooldown dummy
scoreboard objectives add role_settings.ghost.ecto_uses dummy
scoreboard objectives add role_settings.ghost.first_death_invis_time dummy
scoreboard objectives add role_settings.ghost.timer_initial_length dummy
scoreboard objectives add role_settings.ghost.timer_max_time dummy
scoreboard objectives add role_settings.ghost.haunt_timer_boost dummy
scoreboard objectives add role_settings.ghost.haunt_effect_time dummy
scoreboard objectives add role_settings.ghost.haunt_gives_pumpkin dummy
scoreboard objectives add role_settings.ghost.ectoplasm_radius dummy
scoreboard objectives add role_settings.ghost.ecto_slowness_time dummy
scoreboard objectives add role_settings.ghost.blocks_retain_ecto dummy
scoreboard objectives add role_settings.ghost.block_retain_chance dummy
scoreboard objectives add role_settings.ghost.can_reveal_player_locations dummy
scoreboard objectives add role_settings.ghost.reveal_locations_cooldown dummy

scoreboard objectives add role_settings.soul.enabled dummy
scoreboard objectives add role_settings.soul.has_respawned dummy
scoreboard objectives add role_settings.soul.guessed_cancels_respawn dummy
scoreboard objectives add role_settings.soul.respawn_time dummy
scoreboard objectives add role_settings.soul.respawn_is_announced dummy
scoreboard objectives add role_settings.soul.respawned_counts_towards_tracker dummy

scoreboard objectives add role_settings.serial_killer.enabled dummy
scoreboard objectives add role_settings.serial_killer.target_on_actionbar dummy
scoreboard objectives add role_settings.serial_killer.start_after_first_death dummy
scoreboard objectives add role_settings.serial_killer.target_count dummy
# scoreboard objectives add role_settings.serial_killer. dummy
# scoreboard objectives add role_settings.serial_killer.enabled dummy

scoreboard objectives add role_settings.warlock.enabled dummy
scoreboard objectives add role_settings.warlock.ability_cooldown dummy
scoreboard objectives add role_settings.warlock.cast_uses dummy
scoreboard objectives add role_settings.warlock.damage_increase_time dummy
# tracks time since last cast
scoreboard objectives add role_settings.warlock.time_for_max_charge dummy
scoreboard objectives add role_settings.warlock.base_extra_damage dummy
# also stores number of consecutive hits for players
scoreboard objectives add role_settings.warlock.damage_per_hit dummy 

scoreboard objectives add modifier_settings.tarot_reader.enabled dummy
scoreboard objectives add modifier_settings.sixth_sense.enabled dummy
scoreboard objectives add modifier_settings.double_shot.enabled dummy
scoreboard objectives add modifier_settings.flash.enabled dummy
scoreboard objectives add modifier_settings.raid_boss.enabled dummy
scoreboard objectives add modifier_settings.raid_boss.health_amp dummy
scoreboard objectives add modifier_settings.lovers.enabled dummy
scoreboard objectives add modifier_settings.shy.enabled dummy
scoreboard objectives add modifier_settings.telepath.enabled dummy
scoreboard objectives add modifier_settings.finalist.enabled dummy

scoreboard objectives add modifier_settings.gambler.enabled dummy
scoreboard objectives add modifier_settings.gambler.cooldown dummy
scoreboard objectives add modifier_settings.gambler.even_dice_rolls dummy
scoreboard objectives add modifier_settings.gambler.receive_double_damage_time dummy
scoreboard objectives add modifier_settings.gambler.freeze_duration dummy
scoreboard objectives add modifier_settings.gambler.low_damage_amount dummy
scoreboard objectives add modifier_settings.gambler.low_damage_can_kill dummy
scoreboard objectives add modifier_settings.gambler.block_interaction_duration dummy
scoreboard objectives add modifier_settings.gambler.absorption_level dummy
scoreboard objectives add modifier_settings.gambler.ability_cooldown_reduction dummy
scoreboard objectives add modifier_settings.gambler.weakness_duration dummy
scoreboard objectives add modifier_settings.gambler.slowness_duration dummy
scoreboard objectives add modifier_settings.gambler.nausea_duration dummy
scoreboard objectives add modifier_settings.gambler.resistance_duration dummy
scoreboard objectives add modifier_settings.gambler.strength_duration dummy
scoreboard objectives add modifier_settings.gambler.reveal_innocent_min_players dummy

scoreboard objectives add modifier_settings.repel.enabled dummy
scoreboard objectives add modifier_settings.repel.cooldown dummy
scoreboard objectives add modifier_settings.repel.radius dummy
scoreboard objectives add modifier_settings.repel.knockback_power dummy
scoreboard objectives add modifier_settings.repel.damage dummy

scoreboard objectives add modifier_settings.sentry.enabled dummy
scoreboard objectives add modifier_settings.sentry.cooldown dummy
scoreboard objectives add modifier_settings.sentry.damage_dealt dummy
scoreboard objectives add modifier_settings.sentry.range dummy

scoreboard objectives add modifier_settings.party_animal.enabled dummy
scoreboard objectives add modifier_settings.party_animal.cooldown dummy
scoreboard objectives add modifier_settings.party_animal.uses dummy
scoreboard objectives add modifier_settings.party_animal.cooldown_reduction dummy
scoreboard objectives add modifier_settings.party_animal.min_players dummy
scoreboard objectives add modifier_settings.party_animal.player_radius dummy

scoreboard objectives add modifier_settings.lone_wolf.enabled dummy
scoreboard objectives add modifier_settings.lone_wolf.cooldown dummy
scoreboard objectives add modifier_settings.lone_wolf.uses dummy
scoreboard objectives add modifier_settings.lone_wolf.cooldown_reduction dummy
scoreboard objectives add modifier_settings.lone_wolf.player_radius dummy

scoreboard objectives add modifier_settings.sniper.enabled dummy
scoreboard objectives add modifier_settings.sniper.guess_count dummy

scoreboard objectives add modifier_settings.shout.enabled dummy
scoreboard objectives add modifier_settings.shout.line_delay dummy

scoreboard objectives add modifier_settings.prickly.enabled dummy
scoreboard objectives add modifier_settings.prickly.thorns_chance dummy
scoreboard objectives add modifier_settings.prickly.damage_threshold_for_thorns dummy
scoreboard objectives add modifier_settings.prickly.thorns_damage dummy

scoreboard objectives add modifier_settings.nurse.enabled dummy
scoreboard objectives add modifier_settings.nurse.cooldown dummy
scoreboard objectives add modifier_settings.nurse.health_strength dummy
scoreboard objectives add modifier_settings.nurse.heal_delay dummy

scoreboard objectives add modifier_settings.addict.enabled dummy
scoreboard objectives add modifier_settings.addict.cooldown dummy
scoreboard objectives add modifier_settings.addict.effect_duration dummy
scoreboard objectives add modifier_settings.addict.nausea_separation_min dummy
scoreboard objectives add modifier_settings.addict.nausea_separation_max dummy
scoreboard objectives add modifier_settings.addict.nausea_duration dummy

scoreboard objectives add modifier_settings.comeback.enabled dummy
scoreboard objectives add modifier_settings.comeback.health_threshold dummy
scoreboard objectives add modifier_settings.comeback.strength_duration dummy
scoreboard objectives add modifier_settings.comeback.strength_amplifier dummy

scoreboard objectives add modifier_settings.lifesteal.enabled dummy
scoreboard objectives add modifier_settings.lifesteal.heal_amount dummy

scoreboard objectives add modifier_settings.disperser.enabled dummy
scoreboard objectives add modifier_settings.disperser.disperser_cooldown dummy
scoreboard objectives add modifier_settings.disperser.allow_duplicate_locations dummy
scoreboard objectives add modifier_settings.disperser.remove_disperser_location dummy

scoreboard objectives add modifier_settings.agent.enabled dummy
scoreboard objectives add modifier_settings.agent.update_frequency_type dummy
scoreboard objectives add modifier_settings.agent.killer_target_chance dummy
scoreboard objectives add modifier_settings.agent.notify_on_death dummy
scoreboard objectives add modifier_settings.agent.notify_on_interactions dummy
scoreboard objectives add modifier_settings.agent.hide_if_close dummy
scoreboard objectives add modifier_settings.agent.line_changes_colors dummy
scoreboard objectives add modifier_settings.agent.line_alpha_start_distance dummy
scoreboard objectives add modifier_settings.agent.alpha_requires_line_of_sight dummy

scoreboard objectives add modifier_settings.radar.enabled dummy
scoreboard objectives add modifier_settings.radar.update_frequency dummy
scoreboard objectives add modifier_settings.radar.changes_colors dummy
scoreboard objectives add modifier_settings.radar.hide_if_close dummy
scoreboard objectives add modifier_settings.radar.shrinks_very_close dummy
scoreboard objectives add modifier_settings.radar.line_alpha_start_distance dummy
scoreboard objectives add modifier_settings.radar.alpha_requires_line_of_sight dummy

scoreboard objectives add modifier_settings.hacker.enabled dummy
scoreboard objectives add modifier_settings.hacker.cooldown_reduction dummy

scoreboard objectives add modifier_settings.underdog.enabled dummy
scoreboard objectives add modifier_settings.underdog.cooldown_reduction dummy

scoreboard objectives add modifier_settings.diseased.enabled dummy
scoreboard objectives add modifier_settings.diseased.cooldown_multiplier dummy

scoreboard objectives add modifier_settings.frosty.enabled dummy
scoreboard objectives add modifier_settings.frosty.slowness_time dummy
scoreboard objectives add modifier_settings.frosty.slowness_amplifier dummy
scoreboard objectives add modifier_settings.frosty.show_particles dummy

scoreboard objectives add modifier_settings.jammer.enabled dummy
scoreboard objectives add modifier_settings.jammer.jam_time dummy

scoreboard objectives add modifier_settings.rotting.enabled dummy
scoreboard objectives add modifier_settings.rotting.rot_time dummy

scoreboard objectives add modifier_settings.shy.enabled dummy
scoreboard objectives add modifier_settings.shy.detect_y_velocity dummy
scoreboard objectives add modifier_settings.shy.shy_time dummy
scoreboard objectives add modifier_settings.shy.show_particles dummy

# role draft data
scoreboard objectives add role_draft.current_timer dummy
scoreboard objectives add role_draft.current_player_id dummy
scoreboard objectives add role_draft.is_running dummy

# ghost data
scoreboard objectives add ghost.ghost_player_id dummy
scoreboard objectives add ghost.ghost_player_role_id dummy
scoreboard objectives add ghost.ghost_player_custom_role_id dummy
scoreboard objectives add ghost.killer_player_id dummy
scoreboard objectives add ghost.killer_player_role_id dummy
scoreboard objectives add ghost.killer_player_custom_role_id dummy
scoreboard objectives add ghost.players_nearby_at_death dummy
scoreboard objectives add entity.lifetime dummy

# sound data
scoreboard objectives add sound.post_song_delay dummy
scoreboard objectives add sound.current_song_length dummy
scoreboard objectives add sound.current_song_time dummy

# player data
scoreboard objectives add player.role_id dummy
scoreboard objectives add player.custom_role_id dummy
scoreboard objectives add player.time_since_sword_click dummy
    # stored in the 100s
scoreboard objectives add player.default_cooldown_multiplier dummy 
    # stored in the 100s
scoreboard objectives add player.cooldown_multiplier dummy 
scoreboard objectives add player.modifier_id dummy
scoreboard objectives add player.guesses dummy
scoreboard objectives add player.safe_guesses dummy
scoreboard objectives add player.player_id dummy
scoreboard objectives add player.target_id dummy
scoreboard objectives add player.mark_used dummy
scoreboard objectives add player.modifier_used dummy
scoreboard objectives add player.lover_id dummy
scoreboard objectives add player.set_alignment dummy
scoreboard objectives add player.has_murderer_channel_access dummy
scoreboard objectives add player.chat_channel.index dummy
scoreboard objectives add player.saved_channel.index dummy
scoreboard objectives add player.ability_hold_time dummy
# scoreboard objectives add player.action_cooldown dummy
scoreboard objectives add player.considered_dead_count dummy
scoreboard objectives add player.has_joined dummy
scoreboard objectives add player.action_charges dummy
scoreboard objectives add player.modifier_uses dummy
scoreboard objectives add player.modifier_cooldown dummy
scoreboard objectives add player.block_interaction_timer dummy
scoreboard objectives add player.super_armor_uses dummy
scoreboard objectives add player.deal_double_damage_uses dummy
scoreboard objectives add player.receive_double_damage_timer dummy
scoreboard objectives add player.sound.sound_settings dummy
scoreboard objectives add player.sound.volume dummy
scoreboard objectives add player.sound.sfx_volume dummy

# player stats
scoreboard objectives add player_stats.current_session dummy
scoreboard objectives add player_stats.deaths.total dummy
scoreboard objectives add player_stats.kills_on_killer.total dummy
scoreboard objectives add player_stats.kills_as_killer.total dummy
scoreboard objectives add player_stats.times_guessed_successfully.total dummy
scoreboard objectives add player_stats.times_guessed_failed.total dummy
scoreboard objectives add player_stats.times_been_guessed.total dummy
scoreboard objectives add player_stats.punches.total dummy
scoreboard objectives add player_stats.bow_shots_taken.total dummy
scoreboard objectives add player_stats.bow_shots_landed.total dummy
scoreboard objectives add player_stats.damage_dealt.total dummy
scoreboard objectives add player_stats.damage_received.total dummy
scoreboard objectives add player_stats.murderer_rounds.total dummy
scoreboard objectives add player_stats.neutral_killer_rounds.total dummy
scoreboard objectives add player_stats.neutral_independent_rounds.total dummy
scoreboard objectives add player_stats.innocent_rounds.total dummy
scoreboard objectives add player_stats.rounds_won.total dummy
scoreboard objectives add player_stats.rounds_finished.total dummy
scoreboard objectives add player_stats.rounds_played.total dummy
scoreboard objectives add player_stats.deaths.session dummy
scoreboard objectives add player_stats.kills_on_killer.session dummy
scoreboard objectives add player_stats.kills_as_killer.session dummy
scoreboard objectives add player_stats.times_guessed_successfully.session dummy
scoreboard objectives add player_stats.times_guessed_failed.session dummy
scoreboard objectives add player_stats.times_been_guessed.session dummy
scoreboard objectives add player_stats.punches.session dummy
scoreboard objectives add player_stats.bow_shots_taken.session dummy
scoreboard objectives add player_stats.bow_shots_landed.session dummy
scoreboard objectives add player_stats.damage_dealt.session dummy
scoreboard objectives add player_stats.damage_received.session dummy
scoreboard objectives add player_stats.murderer_rounds.session dummy
scoreboard objectives add player_stats.neutral_killer_rounds.session dummy
scoreboard objectives add player_stats.neutral_independent_rounds.session dummy
scoreboard objectives add player_stats.innocent_rounds.session dummy
scoreboard objectives add player_stats.rounds_won.session dummy
scoreboard objectives add player_stats.rounds_finished.session dummy
scoreboard objectives add player_stats.rounds_played.session dummy

# used for neutral independents
scoreboard objectives add player.meets_win dummy 

scoreboard objectives add world_state dummy

execute unless score game_data world_state matches 1 run function helpers/setup/set_default_scoreboards