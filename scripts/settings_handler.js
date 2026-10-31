"use strict";

import { world, system, Player } from "@minecraft/server";

import { ActionFormData, CustomForm, ModalFormData, ObservableNumber, ObservableString } from "@minecraft/server-ui";
import { ScoreboardManager } from "./scoreboard_manager";
import { RoleManager } from "./role_manager"
import { Role, RoleAlignment, RoleTypes } from "./role"
import { SoundManager } from "./sound_manager";
import { PackTypes, SoundPack } from "./sound/pack";
import { ModifierManager } from "./modifier_manager";
import { Modifier, ModifierAlignment } from "./modifier";
import { PresetManager } from "./preset_manager";
import { Preset } from "./presets/preset";
import { Util } from "./util";
import { PlayerStatsHandler } from "./player_stats";
import { LogManager } from "./log_manager";
import { CustomRoleManager } from "./custom_role_manager";

export class SettingsHandler {
    static basicAbilityCooldownMin = 15;
    static basicAbilityCooldownMax = 90;
    static basicAbilityCooldownInterval = 5;

    static powerAbilityCooldownMin = 30;
    static powerAbilityCooldownMax = 150;
    static powerAbilityCooldownInterval = 5;

    static openConfig(player) {
        this.openGameSettings(player);
    }

    static _getPlayingPlayers(players) {
        let livePlayers = [];
        players.forEach((player) => {
            if (!player.hasTag("AFK")) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }

    static openGameSettings(player) {
        let form = new ActionFormData();
        form.title("Settings");
        form.body("Change game settings here.");
        form.button("Player Role Settings");
        form.button("Game Settings");
        form.button("Role Settings");
        form.button("Modifier Settings");
        form.button("Map Settings");
        form.button("Sound Settings");
        form.button("Rule Presets");
        form.button("Custom Roles");
        form.button("Role/Modifier Randomizer");
        form.button("About/Help");

        form.show(player).then(r => {
            if (r.canceled) {
                return;
            }
            // player role settings
            // game settings (management + mechanics)
            // role settings
            // modifier settings
            switch (r.selection) {
                case 0: // Player role settings
                    this.openPlayerRoleSettings(player);
                    break;
                case 1: // Game Settings
                    this.openGameManagementSettings(player);
                    break;
                case 2: // Role Settings
                    this.openRoleSettings(player);
                    break;
                case 3: // Modifier Settings
                    this.openModifierSettings(player);
                    break;
                case 4: // Map Settings
                    this.openMapSettings(player);
                    break;
                case 5: // Sound Settings
                    this.openSoundSettings(player);
                    break;
                case 6: // Rule Presets
                    this.openRulePresetSettings(player);
                    break;
                case 7: // Custom Roles
                    CustomRoleManager.openCustomRoleMenu(player);
                    break;
                case 8: // Game Randomizer
                    this.openGameRandomizer(player);
                    break;
                case 9: // About/Help
                    SettingsHandler.openAboutMenu(player);
                    break;
            }
        });
    }

    static openPlayerRoleSettings(player) {
        let form = new ActionFormData();
        form.title("Player Role Settings");
        form.body("Here you may edit the distribution of alignments and roles.");
        form.button("Game Role & Alignment Settings");
        form.button("Role Count Settings");
        form.button("Role Weight Settings");
        form.button("Back");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            switch (r.selection) {
                case 0:
                    SettingsHandler.openPlayerAlignmentSettings(player);
                    break;
                case 1:
                    SettingsHandler.openPlayerRoleCountSettings(player);
                    break;
                case 2:
                    SettingsHandler.openPlayerRoleWeightSettings(player);
                    break;
                default:
                    SettingsHandler.openGameSettings(player);
                    break;
            }
        });
    }

    static openPlayerAlignmentSettings(player) {
        let playerCount = this._getPlayingPlayers(world.getPlayers()).length;
        let playerLeeway = playerCount + 3;
        let form = new ModalFormData();
        form.title("Game Role Settings");
        form.label("Role options are random between their Min and Max versions. If Min is greater than Max, Max is set to Min. To make it a set value, make both equal.");

        form.divider();

        let murdererCountMin = ScoreboardManager.getTrackedObjective("assignment.murderer_count.min");
        let murdererCountMax = ScoreboardManager.getTrackedObjective("assignment.murderer_count.max");
        form.label("The number of murderers that will be in the game, random between Min and Max. To make it set, make them equal. If 0 Murderers and 0 N-Killers are rolled, 1 murderer will be forced.");
        form.slider("Murderer Count (Min)", 0, playerLeeway, { defaultValue: murdererCountMin }); // 3
        form.slider("Murderer Count (Max)", 0, playerLeeway, { defaultValue: murdererCountMax }); // 4
        
        form.divider();
        
        let randomMurderersMin = ScoreboardManager.getTrackedObjective("assignment.random_murderers.min");
        let randomMurderersMax = ScoreboardManager.getTrackedObjective("assignment.random_murderers.max");
        form.label("The number of murderer roles assigned to the number of murderers (see above), random between Min and Max. To make it set, make them equal.");
        form.label("After assigning random murderer roles, will assign remaining murderers the regular Murderer role.");
        form.slider("Random Murderers (Min)", 0, playerLeeway, { valueStep: 1, defaultValue: randomMurderersMin }); // 8
        form.slider("Random Murderers (Max)", 0, playerLeeway, { valueStep: 1, defaultValue: randomMurderersMax }); // 9
        
        form.divider();
        
        let randomNIMin = ScoreboardManager.getTrackedObjective("assignment.random_neutral_independents.min");
        let randomNIMax = ScoreboardManager.getTrackedObjective("assignment.random_neutral_independents.max");
        form.label("§eThe number of random neutral independent roles included, selected from enabled neutral independent roles, random between Min and Max. To make it set, make them equal.");
        form.slider("Random Neutral Independent (Min)", 0, playerLeeway, { valueStep: 1, defaultValue: randomNIMin }); // 12
        form.slider("Random Neutral Independent (Max)", 0, playerLeeway, { valueStep: 1, defaultValue: randomNIMax }); // 13
        
        form.divider();
        
        let randomNKMin = ScoreboardManager.getTrackedObjective("assignment.random_neutral_killers.min");
        let randomNKMax = ScoreboardManager.getTrackedObjective("assignment.random_neutral_killers.max");
        form.label("§eThe number of random neutral killer roles included, selected from enabled neutral killer roles, random between Min and Max. To make it set, make them equal.");
        form.slider("Random Neutral Killer (Min)", 0, playerLeeway, { valueStep: 1, defaultValue: randomNKMin }); // 16
        form.slider("Random Neutral Killer (Max)", 0, playerLeeway, { valueStep: 1, defaultValue: randomNKMax }); // 17
        
        form.divider();
        
        let randomInnocentsMin = ScoreboardManager.getTrackedObjective("assignment.random_innocents.min");
        let randomInnocentsMax = ScoreboardManager.getTrackedObjective("assignment.random_innocents.max");
        form.label("§eThe number of random innocent roles included, selected from enabled innocent roles, random between Min and Max. To make it set, make them equal.");
        form.label("Any players that do not receive roles from this selection will be assigned a regular Innocent.");
        form.slider("Random Innocent (Min)", 0, Math.max(playerLeeway, 10), { valueStep: 1, defaultValue: randomInnocentsMin }); // 21
        form.slider("Random Innocent (Max)", 0, Math.max(playerLeeway, 10), { valueStep: 1, defaultValue: randomInnocentsMax }); // 22
        
        form.show(player).then(r => {
            if (r.canceled) {
                return;
            }

            let murdererMin = r.formValues[3];
            let murdererMax = r.formValues[4];
            if (murdererMax < murdererMin) {
                murdererMax = murdererMin;
            }

            let randomMurderersMin = r.formValues[8];
            let randomMurderersMax = r.formValues[9];
            if (randomMurderersMax < randomMurderersMin) {
                randomMurderersMax = randomMurderersMin;
            }

            let neutralIMin = r.formValues[12];
            let neutralIMax = r.formValues[13];
            if (neutralIMax < neutralIMin) {
                neutralIMax = neutralIMin;
            }

            let neutralKMin = r.formValues[16];
            let neutralKMax = r.formValues[17];
            if (neutralKMax < neutralKMin) {
                neutralKMax = neutralKMin;
            }

            let innocentMin = r.formValues[21];
            let innocentMax = r.formValues[22];
            if (innocentMax < innocentMin) {
                innocentMax = innocentMin;
            }
            ScoreboardManager.setTrackedObjective("assignment.murderer_count.min", murdererMin);
            ScoreboardManager.setTrackedObjective("assignment.murderer_count.max", murdererMax);
            ScoreboardManager.setTrackedObjective("assignment.random_murderers.min", randomMurderersMin);
            ScoreboardManager.setTrackedObjective("assignment.random_murderers.max", randomMurderersMax);
            ScoreboardManager.setTrackedObjective("assignment.random_neutral_independents.min", neutralIMin);
            ScoreboardManager.setTrackedObjective("assignment.random_neutral_independents.max", neutralIMax);
            ScoreboardManager.setTrackedObjective("assignment.random_neutral_killers.min", neutralKMin);
            ScoreboardManager.setTrackedObjective("assignment.random_neutral_killers.max", neutralKMax);
            ScoreboardManager.setTrackedObjective("assignment.random_innocents.min", innocentMin);
            ScoreboardManager.setTrackedObjective("assignment.random_innocents.max", innocentMax);

            SettingsHandler.openPlayerRoleSettings(player);
        });
    }

    static openPlayerRoleCountSettings(player) {
        let playerCount = this._getPlayingPlayers(world.getPlayers()).length;
        let playerLeeway = playerCount + 3;
        let form = new ModalFormData();
        form.title("Role Count Settings");

        form.divider();
        form.label("Set the number of each role that can appear in the game");
        form.divider();


        let enabledRoles = RoleManager.getEnabledRoles();
        enabledRoles = enabledRoles.filter((role) => role.getRoleType() != RoleTypes.MURDERER && role.getRoleType() != RoleTypes.INNOCENT);
        enabledRoles.forEach((role) => {
            ScoreboardManager.createScoreboardObjective("role_settings." + role.getRoleType().name + ".role_count");
            let formCount = ScoreboardManager.getTrackedObjective("role_settings." + role.getRoleType().name + ".role_count");
            form.slider(role.getDisplayName() + " Count", -1, Math.max(playerLeeway, 10), {defaultValue:formCount,tooltip:"If -1, will disable the role."});
        });

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            let start = 3;

            for (let i = start; i - start < enabledRoles.length; i++) {
                let chosenRole = enabledRoles[i-start];
                let roleCount = r.formValues[i];
                if (roleCount == -1) {
                    ScoreboardManager.setTrackedObjective("role_settings." + chosenRole.getRoleType().name + ".enabled", 0);
                    world.sendMessage("§oDisabling " + chosenRole.getDisplayName());
                    // player.sendMessage("Disabling " + chosenRole.getDisplayName());
                    continue;
                }
                // player.sendMessage("Set " + chosenRole.getDisplayName() + " count to " + roleCount);
                ScoreboardManager.setTrackedObjective("role_settings." + chosenRole.getRoleType().name + ".role_count", roleCount);
            }

            SettingsHandler.openPlayerRoleSettings(player);
        });
    } 

    static openPlayerRoleWeightSettings(player) {
        let form = new ModalFormData();
        form.title("Role Weight Settings");

        form.divider();
        form.label("Change the likelihood of each role appearing. Weighed against each other.");
        form.divider();

        let enabledRoles = RoleManager.getEnabledRoles();
        enabledRoles = enabledRoles.filter((role) => role.getRoleType() != RoleTypes.MURDERER && role.getRoleType() != RoleTypes.INNOCENT);
        enabledRoles.forEach((role) => {
            ScoreboardManager.createScoreboardObjective("role_settings." + role.getRoleType().name + ".weight");
            let formCount = ScoreboardManager.getTrackedObjective("role_settings." + role.getRoleType().name + ".weight");
            form.slider(role.getDisplayName() + " Weight", 0, 105, {valueStep:5,defaultValue:formCount,tooltip:"The chance for this role to be rolled. Weighed against other role weights. 105 will try to force this role in."});
        });

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            let start = 3;

            for (let i = start; i - start < enabledRoles.length; i++) {
                let chosenRole = enabledRoles[i-start];
                let roleWeight = r.formValues[i];
                // player.sendMessage("Set " + chosenRole.getDisplayName() + " count to " + roleWeight);
                ScoreboardManager.setTrackedObjective("role_settings." + chosenRole.getRoleType().name + ".weight", roleWeight);
            }

            SettingsHandler.openPlayerRoleSettings(player);
        });
    }

    static openRoleSettings(player) {
        let form = new ActionFormData();
        form.title("Role Settings");
        form.body("Select a section of roles in order to change.");
        form.button("Enabled Roles");
        form.button("All Roles");
        form.button("Innocent Roles");
        form.button("Neutral Killer Roles");
        form.button("Neutral Independent Roles");
        form.button("Murderer Roles");
        form.button("Back");

        form.show(player).then(r => {
            if (r.canceled) {
                return;
            }
            switch (r.selection) {
                case 0: // Enabled Roles
                    this.openEnabledRoleSettings(player);
                    break;
                case 1: // All Roles
                    this.openAllRoleSettings(player);
                    break;
                case 2: // Innocent Roles
                    this.openInnocentRoleSettings(player);
                    break;
                case 3: // Neutral Killer Roles
                    this.openNeutralKillerRoleSettings(player);
                    break;
                case 4: // Neutral Independent Roles
                    this.openNeutralIndependentRoleSettings(player);
                    break;
                case 5: // Murderer Roles
                    this.openMurdererRoleSettings(player);
                    break;
                default:
                    this.openGameSettings(player);
                    break;

            }
        });
    }

    static openModifierSettings(player) {
        let form = new ActionFormData();
        form.title("Modifier Settings");
        form.body("Select a section of modifiers in order to change.");
        form.button("Player Modifier Settings");
        form.button("Enabled Modifiers");
        form.button("All Modifiers");
        form.button("Universal Modifiers");
        form.button("Non-Killer Modifiers");
        form.button("Killer Modifiers");
        form.button("Murderer Modifiers");
        form.button("Back");

        form.show(player).then(r => {
            if (r.canceled) {
                return;
            }
            switch (r.selection) {
                case 0: // modifier settings
                    SettingsHandler.openPlayerModifierSettings(player);
                    break;
                case 1: // Enabled modifiers
                    SettingsHandler.openEnabledModifierSettings(player);
                    break;
                case 2: // All modifiers
                    SettingsHandler.openAllModifierSettings(player);
                    break;
                case 3: // Universal modifiers
                    SettingsHandler.openUniversalModifierSettings(player);
                    break;
                case 4: // Non-Killer modifiers
                    SettingsHandler.openNonKillerModifierSettings(player);
                    break;
                case 5: // Killer modifiers
                    SettingsHandler.openKillerModifierSettings(player);
                    break;
                case 6: // Murderer modifiers
                    SettingsHandler.openMurdererModifierSettings(player);
                    break;
                default:
                    SettingsHandler.openGameSettings(player);
                    break;
            }
        });
    }

    static openPlayerModifierSettings(player) {
        let form = new ActionFormData();
        form.title("Player Modifier Settings");
        form.body("Here you may edit the distribution of modifiers.");
        form.button("General Modifier Settings");
        form.button("Modifier Count Settings");
        form.button("Modifier Weight Settings");
        form.button("Back");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            switch (r.selection) {
                case 0:
                    SettingsHandler.openPlayerModifierAlignmentSettings(player);
                    break;
                case 1:
                    SettingsHandler.openPlayerModifierCountSettings(player);
                    break;
                case 2:
                    SettingsHandler.openPlayerModifierWeightSettings(player);
                    break;
                default:
                    SettingsHandler.openModifierSettings(player);
                    break;
            }
        });
    }

    static openPlayerModifierAlignmentSettings(player) {
        let playerCount = this._getPlayingPlayers(world.getPlayers()).length;
        let playerLeeway = playerCount + 3;
        let form = new ModalFormData();
        form.title("General Modifier Settings");
        form.label("Modifiers are assigned at random. Every player rolls a chance to get a modifier."); // 0

        form.divider();

        let modifiersEnabled = ScoreboardManager.getTrackedObjective("settings.modifiers.enabled") != 0;
        let modifierChance = ScoreboardManager.getTrackedObjective("settings.modifiers.modifier_chance");
        form.toggle("Modifiers On", { defaultValue: modifiersEnabled, tooltip: "After turning this on, you will have to fresh this form to see enabled modifiers." }); // 2
        form.slider("Modifier Chance", 0, 100, { defaultValue: modifierChance, valueStep: 5 }); // 3
        form.label("The chance for any individual player to get a modifier.");
        
        let maxCountMin = ScoreboardManager.getTrackedObjective("settings.modifiers.max_modifier_count_min");
        let maxCountMax = ScoreboardManager.getTrackedObjective("settings.modifiers.max_modifier_count_max");
        form.slider("Max Modifier Count (Min)", 0, Math.max(playerLeeway, 10), { defaultValue: maxCountMin }); // 5
        form.slider("Max Modifier Count (Max)", 0, Math.max(playerLeeway, 10), { defaultValue: maxCountMax }); // 6
        
        form.divider();
        
        form.label("The following settings are overrides for the modifier chance based on role alignment. If -5, it will use the above modifier chance rather than an override.");
        
        let murdererModChance = ScoreboardManager.getTrackedObjective("settings.modifiers.murderer_modifier_chance");
        form.slider("Modifier Chance (Murderer)", -5, 100, { defaultValue: murdererModChance, valueStep: 5 }); // 9
        let neutralKModChance = ScoreboardManager.getTrackedObjective("settings.modifiers.neutral_killer_modifier_chance");
        form.slider("Modifier Chance (Neutral Killer)", -5, 100, { defaultValue: neutralKModChance, valueStep: 5 }); // 10
        let neutralIModChance = ScoreboardManager.getTrackedObjective("settings.modifiers.neutral_independent_modifier_chance");
        form.slider("Modifier Chance (Neutral Independent)", -5, 100, { defaultValue: neutralIModChance, valueStep: 5 }); // 11
        let innocentModChance = ScoreboardManager.getTrackedObjective("settings.modifiers.innocent_modifier_chance");
        form.slider("Modifier Chance (Innocent)", -5, 100, { defaultValue: innocentModChance, valueStep: 5 }); // 12
        
        form.divider(); // 13

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("settings.modifiers.enabled", r.formValues[2] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.modifiers.modifier_chance", r.formValues[3]);

            ScoreboardManager.setTrackedObjective("settings.modifiers.max_modifier_count_min", r.formValues[5]);
            ScoreboardManager.setTrackedObjective("settings.modifiers.max_modifier_count_max", r.formValues[6]);

            ScoreboardManager.setTrackedObjective("settings.modifiers.murderer_modifier_chance", r.formValues[9]);
            ScoreboardManager.setTrackedObjective("settings.modifiers.neutral_killer_modifier_chance", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("settings.modifiers.neutral_independent_modifier_chance", r.formValues[11]);
            ScoreboardManager.setTrackedObjective("settings.modifiers.innocent_modifier_chance", r.formValues[12]);

            SettingsHandler.openPlayerModifierSettings(player);
        });
    }

    static openPlayerModifierCountSettings(player) {
        let playerCount = this._getPlayingPlayers(world.getPlayers()).length;
        let playerLeeway = playerCount + 3;
        let form = new ModalFormData();
        form.title("Modifier Count Settings");
        
        form.divider();
        form.label("Control the number of each modifier that can appear.");
        form.divider();

        let enabledModifiers = ModifierManager.getEnabledModifiers();
        enabledModifiers.forEach((mod) => {
            ScoreboardManager.createScoreboardObjective("modifier_settings." + mod.getModifierType().name + ".mod_count");
            let formCount = ScoreboardManager.getTrackedObjective("modifier_settings." + mod.getModifierType().name + ".mod_count");
            form.slider(mod.getDisplayName() + " Count", -1, Math.max(playerLeeway, 10), {defaultValue:formCount,tooltip:"If -1, will disable the role."});
        });

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            let start = 3;

            for (let i = start; i < start + enabledModifiers.length; i++) {
                let chosenMod = enabledModifiers[i-start];
                let modCount = r.formValues[i];
                if (modCount == -1) {
                    ScoreboardManager.setTrackedObjective("modifier_settings." + chosenMod.getModifierType().name + ".enabled", 0);
                    world.sendMessage("§oDisabling " + chosenMod.getDisplayName());
                    // player.sendMessage("Disabling " + chosenMod.getDisplayName());
                    continue;
                }
                // player.sendMessage("Set " + chosenMod.getDisplayName() + " count to " + modCount);
                ScoreboardManager.setTrackedObjective("modifier_settings." + chosenMod.getModifierType().name + ".mod_count", modCount);
            }

            SettingsHandler.openPlayerModifierSettings(player);
        });
    }

    static openPlayerModifierWeightSettings(player) {
        let playerCount = this._getPlayingPlayers(world.getPlayers()).length;
        let playerLeeway = playerCount + 3;
        let form = new ModalFormData();
        form.title("Modifier Weight Settings");
        
        form.divider();
        form.label("Change the likelihood of each modifier appearing. Weighed against each other.");
        form.divider();

        let enabledModifiers = ModifierManager.getEnabledModifiers();
        enabledModifiers.forEach((mod) => {
            ScoreboardManager.createScoreboardObjective("modifier_settings." + mod.getModifierType().name + ".weight");
            let formWeight = ScoreboardManager.getTrackedObjective("modifier_settings." + mod.getModifierType().name + ".weight");
            form.slider(mod.getDisplayName() + " Weight", 0, 105, {valueStep:5,defaultValue:formWeight,tooltip:"The chance for this modifier to be rolled. Weighed against other modifier weights. 105 will try to force the modifier in."});
        });

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            let start = 3;

            for (let i = start; i < start + enabledModifiers.length; i++) {
                let chosenMod = enabledModifiers[i-start];
                let modWeight = r.formValues[i];
                player.sendMessage("Set " + chosenMod.getDisplayName() + " weight to " + modWeight);
                ScoreboardManager.setTrackedObjective("modifier_settings." + chosenMod.getModifierType().name + ".weight", modWeight);
            }

            SettingsHandler.openPlayerModifierSettings(player);
        });
    }

    static openMapSettings(player) {
        let form = new ModalFormData();

        form.title("Map Settings");
        form.divider();
        form.label("These are the map specific settings, which allows you to make your map more consistent or customized.");
        
        let mapOptions = ["Allow", "Creative Only", "Block"];
        // let controlNametags = ScoreboardManager.getTrackedObjective("settings.map_settings.control_nametags") != 0;
        // form.toggle("Control Nametag Visibility", {defaultValue: controlNametags}); // 2
        // form.label("If true, nametags will be visible while the game is not considered running and hidden while a round is going.");
        
        let preventPot = ScoreboardManager.getTrackedObjective("settings.map_settings.prevent_pot_interaction");
        form.dropdown("Allow Interact with Pots", mapOptions, {defaultValueIndex: preventPot}); // 2
        
        let preventShelves = ScoreboardManager.getTrackedObjective("settings.map_settings.prevent_shelves_interaction");
        form.dropdown("Allow Interact with Shelves", mapOptions, {defaultValueIndex: preventShelves}); // 3

        let preventBed = ScoreboardManager.getTrackedObjective("settings.map_settings.prevent_bed_interaction");
        form.dropdown("Allow Interact with Beds", mapOptions, {defaultValueIndex: preventBed, tooltip: "This will also block settings spawn."}); // 6
        
        let preventArmorStand = ScoreboardManager.getTrackedObjective("settings.map_settings.prevent_armor_stand_interaction");
        form.dropdown("Allow Interact with Armor Stands", mapOptions, {defaultValueIndex: preventArmorStand}); // 5
        
        let preventCampfire = ScoreboardManager.getTrackedObjective("settings.map_settings.prevent_campfires_interaction");
        form.dropdown("Allow Interact with Campfires", mapOptions, {defaultValueIndex: preventCampfire}); // 6
        
        let preventCandles = ScoreboardManager.getTrackedObjective("settings.map_settings.prevent_candles_interaction");
        form.dropdown("Allow Interact with Candles", mapOptions, {defaultValueIndex: preventCandles}); // 7
        
        let preventChisledBookshelves = ScoreboardManager.getTrackedObjective("settings.map_settings.prevent_chisled_bookshelves_interaction");
        form.dropdown("Allow Interact with Chisled Bookshelves", mapOptions, {defaultValueIndex: preventChisledBookshelves}); // 8
        
        let preventFlowerPots = ScoreboardManager.getTrackedObjective("settings.map_settings.prevent_flower_pot_interaction");
        form.dropdown("Allow Interact with Flower Pots", mapOptions, {defaultValueIndex: preventFlowerPots}); // 9
        
        let preventDragonEgg = ScoreboardManager.getTrackedObjective("settings.map_settings.prevent_dragon_egg_interaction");
        form.dropdown("Allow Interact with Dragon Eggs", mapOptions, {defaultValueIndex: preventDragonEgg}); // 10
        
        let preventRespawnAnchor = ScoreboardManager.getTrackedObjective("settings.map_settings.prevent_respawn_anchors_interaction");
        form.dropdown("Allow Interact with Respawn Anchors", mapOptions, {defaultValueIndex: preventRespawnAnchor}); // 11

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            // ScoreboardManager.setTrackedObjective("settings.map_settings.control_nametags", r.formValues[2] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.map_settings.prevent_pot_interaction", r.formValues[2]);
            ScoreboardManager.setTrackedObjective("settings.map_settings.prevent_shelves_interaction", r.formValues[3]);
            ScoreboardManager.setTrackedObjective("settings.map_settings.prevent_bed_interaction", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("settings.map_settings.prevent_armor_stand_interaction", r.formValues[5]);
            ScoreboardManager.setTrackedObjective("settings.map_settings.prevent_campfires_interaction", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("settings.map_settings.prevent_candles_interaction", r.formValues[7]);
            ScoreboardManager.setTrackedObjective("settings.map_settings.prevent_chisled_bookshelves_interaction", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("settings.map_settings.prevent_flower_pot_interaction", r.formValues[9]);
            ScoreboardManager.setTrackedObjective("settings.map_settings.prevent_dragon_egg_interaction", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("settings.map_settings.prevent_respawn_anchors_interaction", r.formValues[11]);

            // reloads nametags
            ScoreboardManager.setGameState(ScoreboardManager.getGameState());

            SettingsHandler.openGameSettings(player);
        });
    }

    static openSoundSettings(player) {
        let form = new ActionFormData();

        form.title("Game Sound Settings");
        form.body("This is the global sound settings. You can edit how music is played and the builtin and map pack.");
        
        form.button("General Settings");
        form.button("Edit Builtin Pack");
        form.button("Edit Map Pack");
        form.button("Back");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            switch (r.selection) {
                case 0: // general settings
                    SettingsHandler.editGeneralSoundSettings(player);
                    break;
                case 1: // builtin
                    SoundManager.openPackSettings(player, SoundManager.builtinPack);
                    break;
                case 2: // map
                    SoundManager.openPackSettings(player, SoundManager.mapPack);
                    break;
                case 3: // back
                    SettingsHandler.openGameSettings(player);
                    break;
            }
        });
    }

    static editGeneralSoundSettings(player) {
        let form = new ModalFormData();

        form.title("General Sound Settings");
        form.label("Edit the global/default sound settings here.");

        let builtinWeight = ScoreboardManager.getTrackedObjective("settings.sound.builtin_chance");
        let mapWeight = ScoreboardManager.getTrackedObjective("settings.sound.map_chance");
        let customWeight = ScoreboardManager.getTrackedObjective("settings.sound.custom_chance");
        let delayMin = ScoreboardManager.getTrackedObjective("settings.sound.song_delay_min");
        let delayMax = ScoreboardManager.getTrackedObjective("settings.sound.song_delay_max");

        let soundEnabledGlobal = ScoreboardManager.getTrackedObjective("player.sound.sound_settings") != 0;
        form.toggle("Sound System Enabled", { defaultValue: soundEnabledGlobal }); // 1

        form.slider("Builtin Pack Weight", 0, 20, {defaultValue: builtinWeight}); // 2
        form.slider("Map Pack Weight", 0, 20, {defaultValue: mapWeight}); // 3
        form.slider("Custom Pack Weight", 0, 20, {defaultValue: customWeight}); // 4
        form.label("Map sound pack: " + (SoundManager.mapSoundPack != null));

        form.label("The following is the amount of time between songs being queued.");
        form.slider("Song Queue Delay Min", 0, 60, {defaultValue: delayMin}); // 7
        form.slider("Song Queue Delay Max", 0, 60, {defaultValue: delayMax}); // 8

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("player.sound.sound_settings", r.formValues[1] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.sound.builtin_chance", r.formValues[2]);
            ScoreboardManager.setTrackedObjective("settings.sound.map_chance", r.formValues[3]);
            ScoreboardManager.setTrackedObjective("settings.sound.custom_chance", r.formValues[4]);
            
            let newMin = r.formValues[7];
            let newMax = Math.max(r.formValues[8], newMin);
            ScoreboardManager.setTrackedObjective("settings.sound.song_delay_min", newMin);
            ScoreboardManager.setTrackedObjective("settings.sound.song_delay_max", newMax);

            SettingsHandler.openSoundSettings(player);
        });
    }

    static openRulePresetSettings(player) {
        let form = new ActionFormData();
        form.title("Rule Presets");
        form.body("Here you can load presets, save new ones, or export them.");

        let allPresets = PresetManager.currentPresets;
        allPresets.forEach((preset) => {
            form.button(preset.presetName);
        })

        form.button("Create New Preset");
        form.button("Back");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            if (r.selection < allPresets.length) {
                // select preset menu
                SettingsHandler._actionPresetMenu(player, allPresets[r.selection], r.selection);
                return;
            }
            if (r.selection == allPresets.length) { // new preset
                SettingsHandler._createRulePresetMenu(player);
                return;
            }
            SettingsHandler.openGameSettings(player);
        });
    }

    /**
     * 
     * @param {Player} player 
     * @param {Preset} preset 
     */
    static _editPresetMenu(player, preset, presetIndex) {
        let form = new ModalFormData();
        form.title(preset.presetName);
        form.divider();
        form.label("You can edit this preset here.");
        form.textField("Preset Name", preset.presetName, {defaultValue: preset.presetName});
        form.textField("Preset Description", preset.presetDescription, {defaultValue: preset.presetDescription});
        form.dropdown("Preset Type", ["Game Settings", "Role Settings", "All Settings", "Enabled Roles", "Enabled Modifiers"], {defaultValueIndex: preset.presetType, tooltip: "If this changes, will save to this preset."});
        // form.toggle("Save Preset", {tooltip: "If this is true when the form is submitted, this preset will get saved to."});
        // form.toggle("Load Preset", {tooltip: "If this is true when the form is submitted, this preset will get loaded."});
        // form.toggle("Delete Preset", {tooltip: "If this is true when the form is submitted, this preset will get saved to."});
        // form.label("Of the above options, delete supercedes load which supercedes save.");
        // form.textField()

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            let oldPresetType = preset.presetType;
            preset.presetName = r.formValues[2];
            preset.presetDescription = r.formValues[3];
            preset.presetType = r.formValues[4];

            if (oldPresetType != preset.presetType) {
                PresetManager.saveToPreset(preset);
            }

            PresetManager._savePresetsToArmorStand();
            SettingsHandler._actionPresetMenu(player, preset, presetIndex);
        });
    }

    static _actionPresetMenu(player, preset, presetIndex) {
        let form = new ActionFormData();
        form.title(preset.presetName + " Actions");
        form.body(preset.presetDescription);

        form.button("Edit Preset Settings");
        form.button("Load Preset")
        form.button("Save to Preset");
        form.button("Export Preset");
        form.button("Delete Preset");
        form.button("Back");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            

            // if (toDelete) {
            //     PresetManager.currentPresets.splice(presetIndex, 1);
            // }
            // else if (toLoad) {
            //     PresetManager.loadPreset(preset);
            // }
            // else if (toSave || oldPresetType != preset.presetType) {
            //     PresetManager.saveToPreset(preset);
            // }

            switch (r.selection) {
                case 0: // Edit
                    SettingsHandler._editPresetMenu(player, preset, presetIndex);
                    return;
                case 1: // Load
                    PresetManager.loadPreset(preset);
                    break;
                case 2: // Save
                    PresetManager.saveToPreset(preset);
                    break;
                case 3: // Export
                    SettingsHandler._exportPresetMenu(player, preset, presetIndex);
                    return;
                case 4: // Delete
                    PresetManager.currentPresets.splice(presetIndex, 1);
                    break;
                case 5: // Back
                    break;
            }

            SettingsHandler.openRulePresetSettings(player);
        });
    }

    static _importPresetMenu(player) {
        try {
            let form = new CustomForm(player, "Import Preset");
            
            form.label("Import presets here. These text boxes may only hold up to 5000 characters. If your string has more characters than that, split it into multiple fields.");
            let stringOne = new ObservableString("", {clientWritable:true});
            let stringTwo = new ObservableString("", {clientWritable:true});
            let stringThree = new ObservableString("", {clientWritable:true});
            form.textField("Import Field", stringOne);
            form.textField("Import Field 2", stringTwo);
            form.textField("Import Field 3", stringThree);
            form.button("Submit", () => {
                let fullImport = stringOne.getData() + stringTwo.getData() + stringThree.getData();
                // player.sendMessage(stringOne.getData());
                // player.sendMessage(fullImport);
                let jsonObj = JSON.parse(fullImport);
                PresetManager.importPreset(jsonObj);
                form.close();
            });
            form.closeButton();
            
            // player.sendMessage("Showing custom form");
            form.show();
        } catch (error) {
            player.sendMessage("There was an error, closing form.");
        }
    }

    static _exportPresetMenu(player, preset, presetIndex) {
        let form = new ModalFormData();
        form.title("Export " + preset.presetName);
        let exportValue = JSON.stringify(preset);
        form.divider();
        form.textField("Export String", "", {defaultValue: exportValue, tooltip: "Copy this and paste it when importing this rule preset into a different world or when sharing!"});
        form.submitButton("Back");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler._actionPresetMenu(player, preset, presetIndex);
        });
    }

    static _createRulePresetMenu(player) {
        let form = new CustomForm(player, "Create Rule Preset");
        form.divider();
        form.label("What kind of settings will this preset save?");

        let typeIndex = new ObservableNumber(0, {clientWritable: true});
        form.dropdown("Preset Type", typeIndex, [
            {label: "General Game Settings", value: 0, description: "This preset will only save game settings, such as book assignment, death handling settings, and so on."}, 
            {label: "Role/Modifier Settings", value: 1, description: "This preset will only save role and modifier settings"}, 
            {label: "All Settings", value: 2, description:"This preset will save all settings not related to the map or sound."},
            {label: "Enabled Roles", value: 3, description:"This preset will only save roles' enabled state."},
            {label: "Enabled Modifiers", value: 4, description:"This preset will only save modifiers' enabled state."}
        ]);
        
        form.button("Submit", () => {
            // create new preset and open it
            let presetType = typeIndex.getData();
            player.sendMessage("making preset of type " + presetType);
            let preset = new Preset("New Preset", "New Preset's Description", "", presetType);
            PresetManager.currentPresets.push(preset);
            PresetManager.saveToPreset(preset);
            form.close();
            this._editPresetMenu(player, preset, PresetManager.currentPresets.length-1);
        });
        form.button("Back", () => {
            form.close();
            SettingsHandler.openRulePresetSettings(player);
        });
        form.show();
    }

    // static _createRulePresetMenu(player) {
    //     let form = new CustomForm(player, "Create Rule Preset");
    //     form.divider();
    //     form.label("What settings will this preset save?");

    //     let objectiveMap = PresetManager.getObjectiveMap();
    //     // player.sendMessage("objective map: " + Object.keys(objectiveMap));
        
        
    //     // let typeIndex = new ObservableNumber(0, {clientWritable: true});
    //     // form.dropdown("Preset Type", typeIndex, [{label: "Gemeral Game Settings", value: 0, description: "This preset will only save game settings, such as book assignment, death handling settings, and so on."}, {label: "Role/Modifier Settings", value: 1, description: "This preset will only save role and modifier settings"}, {label: "All Settings", value: 2, description:"This preset will save all settings not related to the map or sound."}]);

    //     // let comp = {address:"",name:""};
    //     let toggleNames = [];
    //     let allObjectsToExplore = Object.keys(objectiveMap).map((key) => {
    //         return {address:key,name:key}
    //     });
    //     let tickCount = 0;
    //     while (allObjectsToExplore.length > 0) {
    //         let nextPiece = allObjectsToExplore.splice(allObjectsToExplore.length-1, 1)[0];
    //         let address = nextPiece.address;
    //         // player.sendMessage("\nAdding piece: " + address);
    //         // player.sendMessage(tickCount + ": " + nextPiece.address);
    //         let hasNull = false;
    //         let newKeys = SettingsHandler.getValueFromAddress(objectiveMap, address)?.map((key) => {
    //             // player.sendMessage("Adding key: " + key);
    //             // player.sendMessage("Formed Address: " + (address + "." + key));
    //             if (key == null || key == 0) {
    //                 hasNull = true;
    //                 return null;
    //             }
    //             let objToAdd = {address: address + "." + key, name:key}
                
    //             return objToAdd;
    //         });
    //         if (newKeys != null && !hasNull) {
    //             allObjectsToExplore = allObjectsToExplore.concat(newKeys);
    //         }
    //         let newToggleBoolean = new ObservableBoolean(false, {clientWritable: true});
    //         let indents = "";
    //         // if (toggleNames.includes(nextPiece.address)) {
    //         //     player.sendMessage("ALREADY INCLUDED: " + nextPiece.address);
                
    //         // }
    //         toggleNames.push(nextPiece.address);
    //         // for (let i = 0; i < nextPiece.address.split(".").length; i++) {
    //         //     indents += "  ";
    //         // }
    //         form.toggle(indents + nextPiece.name, newToggleBoolean, {visible: true});
    //         tickCount++;
    //         // if (tickCount > 1000) {
    //         //     break;
    //         // }
    //         // return;
    //     }
    //     // objectiveMap.forEach((map) => {
    //     //     player.sendMessage("adding toggle with " + map);
    //     //     return;
    //     //     // return;
    //     // });


    //     // general game: 
        
    //     // save just enabled
    //     // save weights
    //     // save counts

    //     form.button("Exit", () => {
    //         form.close();
    //     }); // 3
    //     form.show();
    //     // form.
    //     // .then((r) => {
    //     //     if (r.canceled) {
    //     //         return;
    //     //     }

    //     //     if (r.selection == 3) {
    //     //         SettingsHandler.openRulePresetSettings(player);
    //     //         return;
    //     //     }

    //     //     // create new preset and open it
    //     //     let presetType = r.selection;
    //     //     // player.sendMessage("making preset of type " + presetType);
    //     //     let preset = new Preset("New Preset", "New Preset's Description", "", presetType);
    //     //     PresetManager.currentPresets.push(preset);
    //     //     PresetManager.saveToPreset(preset);
    //     //     this._editPresetMenu(player, preset, PresetManager.currentPresets.length-1);
    //     // });
    // }

    static getValueFromAddress(map, address) {
        let nextMap = map;
        let addressPieces = address.split(".");
        while (addressPieces.length > 0) {
            let nextPiece = addressPieces.splice(0, 1)[0];
            // world.sendMessage("Checking if map has " + nextPiece);
            if (Object.hasOwn(nextMap, nextPiece)) {
                nextMap = nextMap[nextPiece];
                continue;
            }
            else {
                return null;
            }
            // return nextMap;
        }
        // world.sendMessage("Address " + address + " has data " + JSON.stringify(nextMap))
        return Object.hasOwn(nextMap, "length") ? nextMap : Object.keys(nextMap);
    }

    static _openCustomRoleMenu(player) {
    }

    static openGameRandomizer(player) {
        let form = new ModalFormData();
        form.title("Game Randomizer");
        form.label("To shake things up, you can have the game turn on/off roles and modifiers. Upon submitting this form, enabled roles/modifiers will be randomized based on these settings. To cancel, close the form on the top-right.");

        let murdererRoles = RoleManager.getMurdererRoles().filter((r) => r.getRoleType() != RoleTypes.MURDERER);
        let neutralKillerRoles = RoleManager.getNeutralKillerRoles();
        let neutralIndependentRoles = RoleManager.getNeutralIndependentRoles();
        let innocentRoles = RoleManager.getInnocentRoles().filter((r) => r.getRoleType() != RoleTypes.INNOCENT);

        form.divider();
        form.label("Role Randomizer");
        // 3-6
        form.slider("Murderer Roles Enabled", -1, murdererRoles.length, {defaultValue: -1, tooltip: "The number of murderer roles to enable. Leave at -1 to skip murderer role shuffling."});
        form.slider("Neutral Killer Roles Enabled", -1, neutralKillerRoles.length, {defaultValue: -1, tooltip: "The number of neutral killer roles to enable. Leave at -1 to skip neutral killer role shuffling."});
        form.slider("Neutral Independent Roles Enabled", -1, neutralIndependentRoles.length, {defaultValue: -1, tooltip: "The number of neutral independent roles to enable. Leave at -1 to skip neutral independent role shuffling."});
        form.slider("Innocent Roles Enabled", -1, innocentRoles.length, {defaultValue: -1, tooltip: "The number of innocent roles to enable. Leave at -1 to skip innocent role shuffling."});
        
        let allModifiers = ModifierManager.getModifiers();
        let universalModifiers = allModifiers.filter((mod) => mod.getModifierAlignment() == ModifierAlignment.ALL);
        let nonKillerModifiers = allModifiers.filter((mod) => mod.getModifierAlignment() == ModifierAlignment.NON_KILLER);
        let killerModifiers = allModifiers.filter((mod) => mod.getModifierAlignment() == ModifierAlignment.KILLERS);
        let murdererModifiers = allModifiers.filter((mod) => mod.getModifierAlignment() == ModifierAlignment.MURDERER);

        form.divider();
        form.label("Modifier Randomizer");
        // 9-12
        form.slider("Universal Modifiers Enabled", -1, universalModifiers.length, {defaultValue: -1, tooltip: "The number of universal modifiers to enable. Leave at -1 to skip universal modifier shuffling."});
        form.slider("Non-Killer Modifiers Enabled", -1, nonKillerModifiers.length, {defaultValue: -1, tooltip: "The number of non-killer modifiers to enable. Leave at -1 to skip non-killer modifiers shuffling."});
        form.slider("Killer Modifiers Enabled", -1, killerModifiers.length, {defaultValue: -1, tooltip: "The number of killer modifiers to enable. Leave at -1 to skip killer modifiers shuffling."});
        form.slider("Murderer Modifiers Enabled", -1, murdererModifiers.length, {defaultValue: -1, tooltip: "The number of murderer modifiers to enable. Leave at -1 to skip murderer modifiers shuffling."});

        form.divider();
        form.label("Role Weight Randomizer");
        // 15-18
        form.toggle("Murderer Role Weight", {defaultValue: false, tooltip: "If true, randomizes all enabled murderer role weights. Otherwise changes nothing."});
        form.toggle("Neutral Killer Role Weight", {defaultValue: false, tooltip: "If true, randomizes all enabled neutral killer role weights. Otherwise changes nothing."});
        form.toggle("Neutral Independent Role Weight", {defaultValue: false, tooltip: "If true, randomizes all enabled neutral independent role weights. Otherwise changes nothing."});
        form.toggle("Innocent Role Weight", {defaultValue: false, tooltip: "If true, randomizes all enabled innocent role weights. Otherwise changes nothing."});

        form.divider();
        form.label("Modifier Weight Randomizer");
        // 21-24
        form.toggle("Universal Modifier Weight", {defaultValue: false, tooltip: "If true, randomizes all enabled universal modifier weights. Otherwise changes nothing."});
        form.toggle("Non-Killer Modifier Weight", {defaultValue: false, tooltip: "If true, randomizes all enabled non-killer modifier weights. Otherwise changes nothing."});
        form.toggle("Killer Modifier Weight", {defaultValue: false, tooltip: "If true, randomizes all enabled killer modifier weights. Otherwise changes nothing."});
        form.toggle("Murderer Modifier Weight", {defaultValue: false, tooltip: "If true, randomizes all enabled murderer modifier weights. Otherwise changes nothing."});
        form.toggle("Reset All Weights to 50", {defaultValue: false, tooltip: "If true, resets all enabled role weights to be 50."});

        form.submitButton("Randomize!");
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler._enableRandomRoles(murdererRoles.slice(), r.formValues[3]);
            SettingsHandler._enableRandomRoles(neutralKillerRoles.slice(), r.formValues[4]);
            SettingsHandler._enableRandomRoles(neutralIndependentRoles.slice(), r.formValues[5]);
            SettingsHandler._enableRandomRoles(innocentRoles.slice(), r.formValues[6]);

            SettingsHandler._enableRandomModifiers(universalModifiers.slice(), r.formValues[9]);
            SettingsHandler._enableRandomModifiers(nonKillerModifiers.slice(), r.formValues[10]);
            SettingsHandler._enableRandomModifiers(killerModifiers.slice(), r.formValues[11]);
            SettingsHandler._enableRandomModifiers(murdererModifiers.slice(), r.formValues[12]);

            SettingsHandler._randomizeRoleWeights(murdererRoles.filter((r) => r.isEnabled()), r.formValues[15]);
            SettingsHandler._randomizeRoleWeights(neutralKillerRoles.filter((r) => r.isEnabled()), r.formValues[16]);
            SettingsHandler._randomizeRoleWeights(neutralIndependentRoles.filter((r) => r.isEnabled()), r.formValues[17]);
            SettingsHandler._randomizeRoleWeights(innocentRoles.filter((r) => r.isEnabled()), r.formValues[18]);

            SettingsHandler._randomizeModifierWeights(universalModifiers.filter((m) => m.isEnabled()), r.formValues[21]);
            SettingsHandler._randomizeModifierWeights(nonKillerModifiers.filter((m) => m.isEnabled()), r.formValues[22]);
            SettingsHandler._randomizeModifierWeights(killerModifiers.filter((m) => m.isEnabled()), r.formValues[23]);
            SettingsHandler._randomizeModifierWeights(murdererModifiers.filter((m) => m.isEnabled()), r.formValues[24]);

            if (r.formValues[25]) {
                let allEnabledRoles = RoleManager.getEnabledRoles();
                allEnabledRoles.forEach((role) => {
                    ScoreboardManager.setTrackedObjective("role_settings." + role.getRoleType().name + ".weight", 50);
                });
                let allEnabledMods = ModifierManager.getEnabledModifiers();
                allEnabledMods.forEach((mod) => {
                    ScoreboardManager.setTrackedObjective("modifier_settings." + mod.getModifierType().name + ".weight", 50)
                });
            }
        });
    }

    static openAboutMenu(player) {
        let form = new ActionFormData();
        form.title("About/Help Menu");

        form.body("Here there are a variety of different menus to help or explain various components of UMM!");
        form.button("UMM's New Mechanics");
        form.button("Important Commands");
        form.button("How to set Player Alignments");
        form.button("Other Game Settings");
        form.button("Being a Player");
        form.button("What are Modifiers?");
        form.button("About Rule Presets");
        form.button("Block Interaction Settings");
        form.button("Custom Music");
        form.button("Custom Roles & Modding");
        form.button("Back");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            switch (r.selection) {
                case 0: // New Mechanics (Role Guessing, Ghost Bodies, Abilities, Protection)
                    SettingsHandler._openNewMechanicsAboutMenu(player);
                    break;
                case 1: // Important Commands
                    SettingsHandler._openImportantCommandsAboutMenu(player);
                    break;
                case 2: // How to set Player Alignments
                    SettingsHandler._openPlayerAlignmentsAboutMenu(player);
                    break;
                case 3: // Other Game Settings
                    SettingsHandler._openGameSettingsAboutMenu(player);
                    break;
                case 4: // Being a player
                    SettingsHandler._openBeingPlayerAboutMenu(player);
                    break;
                case 5: // What are Modifiers
                    SettingsHandler._openModifiersAboutMenu(player);
                    break;
                case 6: // About Rule Presets
                    SettingsHandler._openRulePresetsAboutMenu(player);
                    break;
                case 7: // Block Interaction Settings
                    SettingsHandler._openBlockAboutMenu(player);
                    break;
                case 8: // Custom Music
                    SettingsHandler._openCustomMusicAboutMenu(player);
                    break;
                case 9: // Custom Roles & Modding
                    SettingsHandler._openCustomDataAboutMenu(player);
                    break;
                default:
                    SettingsHandler.openGameSettings(player);
                    break;
            }
        });
    }

    static _openNewMechanicsAboutMenu(player) {
        let form = new ModalFormData();
        form.title("New Mechanics Help");
        form.divider();

        let message = "There are a number of new mechanics and features to UMM";
        message += "\n\n§lRole Guessing§r: The murderer can guess player's roles to wither them (which will kill). If they are wrong, they die instead. The alignments they can guess can be changed in the murderer Role Settings, and are by default Innocent and Neutral Independents. Some roles/modifiers cannot be guessed.";
        message += "\n\n§lGhost Bodies§r: When a player dies, they leave behind a wisp that only certain roles can see, as well as murderers. They contain information about a player's death and can confirm someone died.";
        message += "\n\n§lRole Abilities§r: Everyone gets a role ability item at the start of the game if they don't have one already. This can be used to activate their ability, including interacting with people or ghosts. To interact, look at the target and right click. Role abilities have a cooldown that must expire before using.";
        message += "\n\n§lExtra Protection§r: Off by default, if someone dies in the opening of the game, next game they will have two extra hearts for a short time.";
        message += "\n\nThe pack automatically handles gametags, so unlike traditional MM, you can leave nametags on.";
        form.label(message);

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler.openAboutMenu(player);
        });
    }

    static _openImportantCommandsAboutMenu(player) {
        let form = new ModalFormData();
        form.title("Important Commands Info");
        form.divider();

        let message = "There are a number of slash and exclamation commands in the game, not all of which are listed";
        message += "\n\n§lSlash Commands§r";
        message += "\n/set_config_block - Sets a config block's location. Only needed during setup or changing map features.";
        message += "\n\n/import_pack - Lets you import a sound pack from a string.";
        message += "\n\n/clear_custom_packs - Lets you clear custom sound packs.";
        message += "\n\n/import_ruleset - Lets you import a custom ruleset.";
        message += "\n\n/set_player_op - UMM has a custom OP system that lets you prevent certain players from accessing settings or using set role commands. This lets you OP/de-OP players. The world owner cannot be de-oped.";
        message += "\n\n/set_player_role - Sets a player's role. Requires the role name as a string (not auto-filled)";
        message += "\n\n/set_player_modifier - Sets a player's modifier. Requires the modifier name as a string (not auto-filled)";
        
        message += "\n\n§lExclamation Point Commands§r - These are hidden commands that can be used by typing in chat.";
        message += "\n\n!help <optional role_name> - A command for all players that will show the role help menu if alive and re-send the player roles/living status when dead or AFK. If a role_name is given will show the role help menu for the specified role.";
        message += "\n\n!settings - A command for all players that will give the player a Player Settings item so they don't have to enter creative or have permissions.";
        message += "\n\n!log - Opens the most recent game log (if allowed).";
        message += "\n\n!missing - Prints the status of config blocks and if any are missing. Only needed during setup or changing map features.";
        message += "\n\n!is-op - Tells you if you are OPed for UMM.";
        message += "\n\n!version - Prints the current version of UMM to your chat.";
        message += "\n\n!unfreeze - Unfreezes a player from effects like cryomancer, gambler, and ghost. Use if the game has broken.";
        message += "\n\n!give-role <role_id> - A debug command to give a role book. Role IDs are from 0-52.";
        message += "\n\n!end-draft - A debug command to end the role draft if something bugs out. The current player will lose their hotbar.";
        
        form.label(message);

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler.openAboutMenu(player);
        });
    }

    static _openPlayerAlignmentsAboutMenu(player) {
        let form = new ModalFormData();
        form.title("How to set Player Alignments");
        form.divider();
        
        let message = "The Player Role Alignments tab has a couple of features in it.";
        message += "\n\n§lAlignment Settings§r: Lets you set the minimum and maximum of each alignment. Roles are assigned alignment first then individual roles. You can turn off murderers and just have neutral killers if you wish.";
        message += "\n\n§lRole Counts§r: Roles can only naturally be rolled once, but here you can roll them multiple times. Being enabled and having a count of 0 are different since Role Guessing looks for if the role is enabled, not if it is rollable.";
        message += "\n\n§lRole Weights§r: Lets you determine how likely compared to other roles a role is to be rolled. You can also force a certain role to be rolled if you set its weight to 105.";
        
        form.label(message);

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler.openAboutMenu(player);
        });
    }

    static _openGameSettingsAboutMenu(player) {
        let form = new ModalFormData();
        form.title("About Other Game Settings");
        form.divider();

        let message = "There are a number of other settings in the Game Settings.";
        message += "\n\n§lRole Draft§r: Lets you pick your role from a small selection. Alignments are still assigned. Requires role assignment to be automatic.";
        message += "\n\n§lBook Pass§r: Will make there only be one murderer, who can then elect a second murderer by throwing their role book to someone else.";
        message += "\n\n§lKnockout Mode§r: Will disable the roles/modifiers used in the previous round, used like a round-robin.";
        
        form.label(message);

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler.openAboutMenu(player);
        });
    }

    static _openBeingPlayerAboutMenu(player) {
        let form = new ModalFormData();
        form.title("Being a Player");
        form.divider();

        let message = "There are a number of helpful features for players in the game. All of these stem off the §lPlayer Settings§r item, which players can get by typing !settings into chat.";
        message += "\n\n§lRole Help§r: A description of your role and modifier, including all their config and a more detailed description of how they work.";
        message += "\n\n§lGoing AFK§r: The last option in the Player Settings, makes you go AFK. Will exclude you from the next round without needing to DC. You will be considered dead and will get messaged game updates.";
        
        form.label(message);

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler.openAboutMenu(player);
        });
    }

    static _openModifiersAboutMenu(player) {
        let form = new ModalFormData();
        form.title("What are Modifiers?");
        form.divider();
        
        let message = "Modifiers are like secondary roles that apply in addition to your role, and apply based on alignment. Modifiers can have passive effects or their own abilities. Players have a chance for modifiers, with a default of 100 percent.";
        message += "\nTo enable modifiers, they must be specifically enabled in the modifier settings.";
        
        message += "\n\n§lModifier Alignments§r";
        message += "\nUniversal: These modifiers can be given to any alignment.";
        message += "\nNon-Killer: These modifiers apply to Innocents or Neutral-Independents.";
        message += "\nKiller: These modifiers apply to Murderers or Neutral-Killers.";
        message += "\nMurderers: These modifiers apply to exclusively Murderers.";
        
        message += "\n\n§lModifier Abilities§r";
        message += "\nMany modifiers have abilities. Abilities can be activated by using your sword, either by clicking it twice (with a half second gap, MC is weird) or the much more consistent Crouch + Click sword. Most modifier abilities are one-time use, but a few are infinite use.";
        
        message += "\n\nIf you're having trouble with getting Modifiers to work, make sure Modifiers are enabled in the menu and that their chance is not zero. Make sure alignment chances are -5 or specifically different. There also may not be enough modifiers for the players in the game, so you may want to increase the count of some modifiers.";
        form.label(message);

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler.openAboutMenu(player);
        });
    }

    static _openRulePresetsAboutMenu(player) {
        let form = new ModalFormData();
        form.title("About Rule Presets");
        form.divider();

        form.label("Rule Presets let you save and load rulesets, as well as export them out of the world and into others. Rulesets can save various sets of configuration. The built in modifiers use the Enabled Roles preset types.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler.openAboutMenu(player);
        });
    }

    static _openBlockAboutMenu(player) {
        let form = new ModalFormData();
        form.title("About Block Interactions");
        form.divider();

        form.label("In Map Settings, there are various Blocks that are set to prevent players from interacting with them in adventure, including beds, candles, and more. Blocks can either be prevented in just adventure or in all modes.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler.openAboutMenu(player);
        });
    }

    static _openCustomMusicAboutMenu(player) {
        let form = new ModalFormData();
        form.title("About Custom Music");
        form.divider();

        let message = "The music system is extremely dynamic. As the host, you can add extra songs to the Built-in Pack for everyone to hear (if they have the resource pack). You can also edit the Map pack as the host or map maker to add music based on the map, but most importantly is Custom Music.";
        
        message += "\n\n§lHow do Packs Work?§r";
        message += "\nPacks are a collection of songs. When the game picks a song, it first picks a pack type (Builtin, Map, Custom) based on the settings. Then it picks a random pack, then picks a random song from that pack. ";
        message += "Songs have to specify how long they are and have a likelihood to be picked.";
        
        message += "\n\n§lSo, Custom Music§r";
        message += "\nYou can add custom music using a resource pack. After that, players can individually add music to their custom packs. When these are rolled, everyone will hear their own music, and then everyone will resync.";
        message += "\nPlayers can also opt-out of having their music synced with other people.";
        message += "\n\nIt is recommended to add some custom music, either to the builtin pack or to custom packs, so that the game has more variety in its music.";

        form.label(message);

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler.openAboutMenu(player);
        });
    }

    static _openCustomDataAboutMenu(player) {
        let form = new ModalFormData();
        form.title("Custom Role & Modding Info");
        form.divider();

        let message = "§lCustom Roles§r";
        message += "\nThis pack comes with a custom roles option. These custom roles are basically dummy roles, which can add barebones roles to the game.";
        message += "These roles will act exactly like other roles. Custom roles can have their alignment set, whether they can see ghosts, and more.";
        message += "\n\n§lModding§r";
        message += "\nThere is modding support in this pack, both for custom roles and custom modifiers. Each role and modifier gets its own file, and then the pack has to be told these files are included in the custom_roles/custom_modifiers folder.";
        message += "\nThe modding support isn't anything crazy in this pack, but it should be streamlined enough if you have multiple custom roles to add.";
        
        form.label(message);

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler.openAboutMenu(player);
        });
    }

    /**
     * Disables all roles in roleList and enables numberToRandomize roles.
     * @param {Role[]} roleList 
     * @param {number} numberToRandomize 
     * @returns 
     */
    static _enableRandomRoles(roleList, numberToRandomize) {
        if (numberToRandomize == -1) {
            return;
        }

        roleList.forEach((role) => {
            ScoreboardManager.setTrackedObjective("role_settings." + role.getRoleType().name + ".enabled", 0);
        });

        while (roleList.length > 0 && numberToRandomize > 0) {
            // roll for role
            let nextRoleIndex = ScoreboardManager.rollRandomNumber(0, roleList.length);
            let nextRoleEnable = roleList[nextRoleIndex];

            // enable role
            ScoreboardManager.setRoleAsEnabled(nextRoleEnable);
            roleList.splice(nextRoleIndex, 1);
            numberToRandomize--;
        }
    }

    /**
     * Disables all modifiers in modifierList and enables numberToRandomize modifiers.
     * @param {Role[]} modifierList 
     * @param {number} numberToRandomize 
     * @returns 
     */
    static _enableRandomModifiers(modifierList, numberToRandomize) {
        if (numberToRandomize == -1) {
            return;
        }

        modifierList.forEach((mod) => {
            ScoreboardManager.setTrackedObjective("modifier_settings." + mod.getModifierType().name + ".enabled", 0);
        });

        while (modifierList.length > 0 && numberToRandomize > 0) {
            // roll for role
            let nextRoleIndex = ScoreboardManager.rollRandomNumber(0, modifierList.length);
            let nextRoleEnable = modifierList[nextRoleIndex];

            // enable role
            ScoreboardManager.setModifierAsEnabled(nextRoleEnable);
            modifierList.splice(nextRoleIndex, 1);
            numberToRandomize--;
        }
    }

    /**
     * 
     * @param {Role[]} roles 
     * @param {boolean} randomize
     */
    static _randomizeRoleWeights(roles, randomize) {
        if (randomize == null || !randomize) {
            return;
        }
        roles.forEach((role) => {
            world.sendMessage("Randomizing weight for " + role.getDisplayName());
            ScoreboardManager.setTrackedObjective("role_settings." + role.getRoleType().name + ".weight", ScoreboardManager.rollRandomNumber(0, 101));
        });
    }

    /**
     * 
     * @param {Modifier[]} modifiers 
     * @param {boolean} randomize
     */
    static _randomizeModifierWeights(modifiers, randomize) {
        if (randomize == null || !randomize) {
            return;
        }
        modifiers.forEach((mod) => {
            ScoreboardManager.setTrackedObjective("modifier_settings." + mod.getModifierType().name + ".weight", ScoreboardManager.rollRandomNumber(0, 101));
        });
    }

    /**
     * 
     * @param {Role[]} roles 
     * @returns 
     */
    static _createRoleForm(roles) {
        let form = new ActionFormData();

        roles.forEach((r) => {
            form.button(Util.removeColorCodes(r.getDisplayName()), SettingsHandler._getRoleName(r));
        });

        form.button("Back");
        return form;
    }

    static _getRoleName(r) {
        if (r instanceof Role) {
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("" + r.getDisplayName()));
            return "textures/role_items/" + r.getRoleType().name;
        }
        return ""
    }

    static _showRoleForm(player, form, roles, returnForm) {
        // player.sendMessage("Opening role settings with callback " + returnForm);
        form.show(player).then(r => {
            if (r.canceled) {
                return;
            }

            if (roles.length > r.selection) {
                roles[r.selection].createConfig(player, returnForm);
            }
            else {
                this.openRoleSettings(player);
            }
        });
    }
    
    static _showModifierForm(player, form, modifiers, returnForm) {
        // player.sendMessage("Opening role settings with callback " + returnForm);
        form.show(player).then(r => {
            if (r.canceled) {
                return;
            }

            if (modifiers.length > r.selection) {
                modifiers[r.selection].createConfig(player, returnForm);
            }
            else {
                this.openModifierSettings(player);
            }
        });
    }

    static openEnabledRoleSettings(player) {
        let roles = RoleManager.getEnabledRoles();

        let form = SettingsHandler._createRoleForm(roles);

        form.title("Enabled Roles Settings");
        form.body("Select a role to access its settings.");

        SettingsHandler._showRoleForm(player, form, roles, SettingsHandler.openEnabledRoleSettings);
    }

    static openAllRoleSettings(player) {
        // RoleManager._sortRoles();
        let roles = RoleManager.getRoles();

        let form = SettingsHandler._createRoleForm(roles);

        form.title("All Roles Settings");
        form.body("Select a role to access its settings.");

        SettingsHandler._showRoleForm(player, form, roles, SettingsHandler.openAllRoleSettings);
    }

    static openInnocentRoleSettings(player) {
        // player.sendMessage("Opening innocent settings..");
        let roles = RoleManager.getInnocentRoles();

        let form = SettingsHandler._createRoleForm(roles);

        form.title("Innocent Roles Settings");
        form.body("Select a role to access its settings.");

        SettingsHandler._showRoleForm(player, form, roles, SettingsHandler.openInnocentRoleSettings);
    }

    static openMurdererRoleSettings(player) {
        let roles = RoleManager.getMurdererRoles();

        let form = SettingsHandler._createRoleForm(roles);

        form.title("Murderer Roles Settings");
        form.body("Select a role to access its settings.");

        SettingsHandler._showRoleForm(player, form, roles, SettingsHandler.openMurdererRoleSettings);
    }

    static openNeutralIndependentRoleSettings(player) {
        let roles = RoleManager.getNeutralIndependentRoles();

        let form = SettingsHandler._createRoleForm(roles);

        form.title("Neutral Independent Roles Settings");
        form.body("Select a role to access its settings.");

        SettingsHandler._showRoleForm(player, form, roles, SettingsHandler.openNeutralIndependentRoleSettings);
    }

    static openNeutralKillerRoleSettings(player) {
        let roles = RoleManager.getNeutralKillerRoles();

        let form = SettingsHandler._createRoleForm(roles);

        form.title("Neutral Killer Roles Settings");
        form.body("Select a role to access its settings.");

        SettingsHandler._showRoleForm(player, form, roles, SettingsHandler.openNeutralKillerRoleSettings);
    }

    static openEnabledModifierSettings(player) {
        let mods = ModifierManager.getEnabledModifiers();

        let form = SettingsHandler._createRoleForm(mods);

        form.title("Enabled Modifier Settings");
        form.body("Select a modifier to access its settings.");

        SettingsHandler._showModifierForm(player, form, mods, SettingsHandler.openEnabledModifierSettings);
    }

    static openAllModifierSettings(player) {
        let mods = ModifierManager.getModifiers();

        let form = SettingsHandler._createRoleForm(mods);

        form.title("All Modifier Settings");
        form.body("Select a modifier to access its settings.");

        SettingsHandler._showModifierForm(player, form, mods, SettingsHandler.openAllModifierSettings);
    }

    static openUniversalModifierSettings(player) {
        let mods = ModifierManager.getModifiers().filter((mod) => mod.getModifierAlignment() == ModifierAlignment.ALL);

        let form = SettingsHandler._createRoleForm(mods);

        form.title("Universal Modifier Settings");
        form.body("Select a modifier to access its settings.");

        SettingsHandler._showModifierForm(player, form, mods, SettingsHandler.openUniversalModifierSettings);
    }

    static openMurdererModifierSettings(player) {
        let mods = ModifierManager.getModifiers().filter((mod) => mod.getModifierAlignment() == ModifierAlignment.MURDERER);

        let form = SettingsHandler._createRoleForm(mods);

        form.title("Murderer Modifier Settings");
        form.body("Select a modifier to access its settings.");

        SettingsHandler._showModifierForm(player, form, mods, SettingsHandler.openMurdererModifierSettings);
    }

    static openKillerModifierSettings(player) {
        let mods = ModifierManager.getModifiers().filter((mod) => mod.getModifierAlignment() == ModifierAlignment.KILLERS);

        let form = SettingsHandler._createRoleForm(mods);

        form.title("Killer Modifier Settings");
        form.body("Select a modifier to access its settings.");

        SettingsHandler._showModifierForm(player, form, mods, SettingsHandler.openKillerModifierSettings);
    }

    static openNonKillerModifierSettings(player) {
        let mods = ModifierManager.getModifiers().filter((mod) => mod.getModifierAlignment() == ModifierAlignment.NON_KILLER);

        let form = SettingsHandler._createRoleForm(mods);

        form.title("Non-Killer Modifier Settings");
        form.body("Select a modifier to access its settings.");

        SettingsHandler._showModifierForm(player, form, mods, SettingsHandler.openNonKillerModifierSettings);
    }

    showAllPlayers() {
        let form = new ActionFormData();
        form.title("What player are you guessing?")
    }

    static openGameManagementSettings(player) {
        let form = new ActionFormData();

        form.title("Game Settings");
        form.body("Change general game mechanic settings here.");
        form.button("Role Assignment");
        form.button("Role Draft");
        // form.button("MM2");
        form.button("Role Guessing");
        form.button("Win Condition Handling");
        form.button("Book Pass");
        form.button("Death Handling");
        form.button("Ghost Bodies");
        form.button("Extra Mechanics");
        form.button("Back");

        form.show(player).then(r => {
            if (r.canceled) {
                return;
            }
            switch (r.selection) {
                case 0: // Role Assignment
                    this._openRoleAssignmentSettings(player)
                    // this.openPlayerRoleSettings(player);
                    break;
                case 1: // Role Draft
                    this._openRoleDraftSettings(player);
                    break;
                // case 2: // MM2
                //     this._openRoleMMTSettings(player);
                //     break;
                case 2: // Role Guessing
                    this._openRoleGuessingSettings(player);
                    break;
                case 3: // Win Condition Handling
                    this._openWinConditionSettings(player);
                    break;
                case 4: // Book Pass
                    this._openBookPassSettings(player);
                    break;
                case 5: // Death Handling
                    this._openDeathHandlingSettings(player);
                    break;
                case 6: // Ghost Bodies
                    this._openGhostBodiesSettings(player);
                    break;
                case 7: // Ghost Bodies
                    this._openExtraMechanicsSettings(player);
                    break;
                case 8: // back
                    this.openGameSettings(player);
                    break;
            }
        });
    }

    static _openRoleAssignmentSettings(player) {
        let form = new ModalFormData();

        form.title("Role Assignment Settings");
        form.divider();
        form.label("Role Assignment is how the game gives out roles.");

        form.divider();

        // role assignment
        let currentAssignmentType = ScoreboardManager.getTrackedObjective("settings.role_assignment.enabled");
        form.dropdown("Role Assignment Type", ["Off", "Dispenser", "Automatic"], { defaultValueIndex: currentAssignmentType });
        form.label("Off: Disables role handling. Basically disables all management and makes it manual.\n" +
            "Dispenser: The game will place books into a placed dispenser for setup.\n" +
            "Automatic: When the game starts, players will be assigned roles directly by the game."
        );

        form.divider();

        form.show(player).then(r => {
            if (r.canceled) {
                return;
            }

            // player.sendMessage('' + r.formValues[3]);
            ScoreboardManager.setTrackedObjective("settings.role_assignment.enabled", r.formValues[3]);
            this.openGameManagementSettings(player);
        });

        return;
    }

    static _openRoleManagementSettings(player) {
        let form = new ModalFormData();

        form.title("Role Management Settings");
        form.divider();

        let currentValue = ScoreboardManager.getTrackedObjective("settings.role_management") != 0;
        form.toggle("Role Management", { defaultValue: currentValue });
        form.label("Requires: Role Assignment (dispenser or automatic)");
        form.label("The roles of players will be tracked, allowing the use of roles with special abilities and interactive elements.");

        form.divider();

        form.show(player).then(r => {
            if (r.canceled) {
                return;
            }

            // player.sendMessage('' + r.formValues[1]);
            ScoreboardManager.setTrackedObjective("settings.role_management", r.formValues[1] ? 1 : 0);
            this.openGameManagementSettings(player);
        });

        return;
    }

    static _openRoleMMTSettings(player) {
        let form = new ModalFormData();

        form.toggle("Role Management");
        form.label("Who has what roles will be automatically kept track of, allowing the use of abilities and win condition management.");

        form.divider();
    }

    static _openWinConditionSettings(player) {
        let form = new ModalFormData();

        form.title("Win Condition Management Settings");
        form.divider();

        let currentValue = ScoreboardManager.getTrackedObjective("settings.win_con_management.enabled") != 0;
        form.toggle("Win Condition Management", { defaultValue: currentValue }); // 1
        form.label("Requires: Role Management (on), Death Handling (on)");
        form.label("Keeps track of who has won and will automatically end the game when a team wins.");
        
        form.divider();
        
        let tellAllRoles = ScoreboardManager.getTrackedObjective("settings.win_con_management.tell_roles_after") != 0;
        form.toggle("Tell Roles on End", {defaultValue:tellAllRoles}); // 5
        form.label("Whether to tell the players all of the roles at the end of the game.");

        form.divider();

        form.show(player).then(r => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("settings.win_con_management.enabled", r.formValues[1] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.win_con_management.tell_roles_after", r.formValues[5] ? 1 : 0);
            this.openGameManagementSettings(player);
        });

        return;
    }

    static _openBookPassSettings(player) {
        let form = new ModalFormData();

        form.title("Book Pass Settings");
        form.divider();

        let currentValue = ScoreboardManager.getTrackedObjective("settings.book_pass.enabled") != 0;
        form.toggle("Book Pass", { defaultValue: currentValue }); // 1
        form.label("Requires: Role Management (on), Role Assignment (dispenser/automatic)");
        form.label("Will give everyone a book (if role assignment is automatic). The game will start with only 1 murderer. They can then throw the book to nominate a second murderer, replacing the person's old role.");
        
        form.divider();
        
        let bookPassType = ScoreboardManager.getTrackedObjective("settings.book_pass.copy_type");
        // 5
        form.dropdown("Murderer Copies Role", ["Murderer", "Random Murderer Role", "Exact Copy"], { defaultValueIndex: bookPassType });
        form.label("How the second murderer gets their role. 'Murderer' gives them the basic murderer role, 'Random Murderer Role' gives a random enabled murderer role, and 'Exact Copy' duplicates the first murderer's role.");

        form.divider();

        form.show(player).then(r => {
            if (r.canceled) {
                return;
            }

            // player.sendMessage('' + r.formValues[1]);
            ScoreboardManager.setTrackedObjective("settings.book_pass.enabled", r.formValues[1] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.book_pass.copy_type", r.formValues[5]);
            this.openGameManagementSettings(player);
        });

        return;
    }

    static _openDeathHandlingSettings(player) {
        let form = new ModalFormData();

        form.title("Death Handling Settings");
        form.divider();

        let deathHandlingEnabled = ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
        form.toggle("Death Handling Enabled", { defaultValue: deathHandlingEnabled }); // 1
        form.label("When a player dies, they will be automatically placed into spectator. Roles and events that depend on people dying will also become enabled.");
        
        form.divider();
        
        let tellKillerEnabled = ScoreboardManager.getTrackedObjective("settings.death_handling.tell_killer") != 0;
        let tellKillerRoleEnabled = ScoreboardManager.getTrackedObjective("settings.death_handling.tell_killer_role") != 0;
        form.toggle("Tell Player Their Killer", { defaultValue: tellKillerEnabled }); // 4
        form.toggle("Tell Killer's Role", { defaultValue: tellKillerRoleEnabled });   // 5
        form.label("When a player dies, they will be told their killer's name. If enabled, it can also tell them their killer's role.");

        form.divider();

        let roleShowingEnabled = ScoreboardManager.getTrackedObjective("settings.death_handling.tell_roles") != 0;
        form.toggle("Dead Players Receive Roles", { defaultValue: roleShowingEnabled }); // 8
        form.label("When a player dies, they will also be sent a message containing all the players and their roles.");
        
        form.divider();
        
        let playersAliveEnabled = ScoreboardManager.getTrackedObjective("settings.death_handling.tell_who_is_living") != 0;
        form.toggle("Dead Players Receive Who's Alive", { defaultValue: playersAliveEnabled }); // 11
        form.label("When a player dies, they will also be sent a message containing who is alive and who is dead.");
        
        form.divider();
        
        let deadPlayersGetMessages = ScoreboardManager.getTrackedObjective("settings.death_handling.dead_players_receive_all_chat_messages") != 0;
        form.toggle("Dead Players Receive All Messages", { defaultValue: deadPlayersGetMessages }); // 14
        form.label("Dead players will be forwarded all messages from private channels.");

        form.show(player).then(r => {
            if (r.canceled) {
                return;
            }

            // player.sendMessage('' + r.formValues[1]);
            ScoreboardManager.setTrackedObjective("settings.death_handling.enabled", r.formValues[1] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.death_handling.tell_killer", r.formValues[4] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.death_handling.tell_killer_role", r.formValues[5] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.death_handling.tell_roles", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.death_handling.tell_who_is_living", r.formValues[11] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.death_handling.dead_players_receive_all_chat_messages", r.formValues[14] ? 1 : 0);
            this.openGameManagementSettings(player);
        });

        return;
    }

    static _openRoleDraftSettings(player) {
        let form = new ModalFormData();

        form.title("Role Draft Settings");
        form.divider();

        // role draft
        let draftEnabled = ScoreboardManager.getTrackedObjective("settings.role_draft.enabled") != 0;
        form.toggle("Role Draft Enabled", { defaultValue: draftEnabled }); // 1
        form.label("Requires: Role Assignment (automatic)");
        form.label("At the start of the game when assigned roles, players will be able to draft their role instead of being selected. Role Draft ignores weights.");
        
        form.divider();
        
        let draftOptions = ScoreboardManager.getTrackedObjective("settings.role_draft.option_count");
        form.slider("Maximum Role Draft Options", 2, 9, { valueStep: 1, defaultValue: draftOptions }); // 5
        form.label("The number of roles the game will attempt to show a player to use. One may be shown if there are no murderers or innocent roles.");
        
        let timeToChoose = ScoreboardManager.getTrackedObjective("settings.role_draft.time_to_choose");
        form.slider("Time to Choose Role", 5, 30, { valueStep: 5, defaultValue: timeToChoose }); // 7
        form.label("The number of roles the game will attempt to show a player to use.");
        
        let duplicatesEnabled = ScoreboardManager.getTrackedObjective("settings.role_draft.can_have_duplicates") != 0;
        form.toggle("Role Draft Duplicates", { defaultValue: duplicatesEnabled }); // 9
        form.label("Whether role draft will show people roles that have already been picked. Role Counts act like weights if this is true");
        
        let includeBaseRoles = ScoreboardManager.getTrackedObjective("settings.role_draft.include_base_roles") != 0;
        form.toggle("Include Basic Roles", { defaultValue: includeBaseRoles }); // 9
        form.label("If true, the alignment being drafted is Murderer or Innocent, AND there aren't enough roles enabled in the pool to give the player the max number of draft options, the draft will add a base Murderer role/Innocent role to the pool. This will not be accounted for in role guessing.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            // player.sendMessage('' + r.formValues[1]);
            ScoreboardManager.setTrackedObjective("settings.role_draft.enabled", r.formValues[1] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.role_draft.option_count", r.formValues[5]);
            ScoreboardManager.setTrackedObjective("settings.role_draft.time_to_choose", r.formValues[7]);
            ScoreboardManager.setTrackedObjective("settings.role_draft.can_have_duplicates", r.formValues[9] ? 1 : 0);
            this.openGameManagementSettings(player);
        });
    }

    static _openRoleGuessingSettings(player) {
        let form = new ModalFormData();
        form.title("Role Guessing Settings");

        form.divider();

        let roleGuessingEnabled = ScoreboardManager.getTrackedObjective("settings.role_guessing.enabled") != 0;
        form.toggle("Enable Role Guessing", { defaultValue: roleGuessingEnabled }); // 1
        form.label("Requires: Role Management (on)");
        form.label("Allows murderers to guess people's role. If they are correct, that person dies. If they're wrong, they die.");
        
        form.divider();
        
        let roleGuessCooldown = ScoreboardManager.getTrackedObjective("settings.role_guessing.guess_cooldown");
        // 5
        form.slider("Guess Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SoundManager.powerAbilityCooldownInterval, defaultValue: roleGuessCooldown }); // 5
        form.label("The cooldown in seconds after a guess, successful or not.");
        
        form.divider();
        
        let roleGuessCount = ScoreboardManager.getTrackedObjective("settings.role_guessing.murderer_guess_count");
        form.slider("Number of Role Guesses", -1, 10, { valueStep: 1, defaultValue: roleGuessCount }); // 8
        form.label("The number of role guesses the murderer gets. -1 is infinite");
        
        form.divider();

        let canGuessModifiers = ScoreboardManager.getTrackedObjective("settings.role_guessing.can_guess_modifiers") != 0;
        form.toggle("Can Guess Modifiers", { defaultValue: canGuessModifiers }); // 11
        form.label("Enables the ability to guess modifiers and adds a toggle to the guessing form for whether a guessee is guessing a modifier or not.");

        form.divider();

        let guessingKills = ScoreboardManager.getTrackedObjective("settings.role_guessing.death_on_guess") != 0;
        form.toggle("Death on Guess", { defaultValue: guessingKills }); // 14
        form.label("If someone incorrectly guesses a role, they die instead. If off, people will not die upon a wrong guess.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            // player.sendMessage('' + r.formValues[1]);
            ScoreboardManager.setTrackedObjective("settings.role_guessing.enabled", r.formValues[1] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.role_guessing.guess_cooldown", r.formValues[5]);
            ScoreboardManager.setTrackedObjective("settings.role_guessing.murderer_guess_count", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("settings.role_guessing.can_guess_modifiers", r.formValues[11] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.role_guessing.death_on_guess", r.formValues[14] ? 1 : 0);
            this.openGameManagementSettings(player);
        });
    }

    static _openGhostBodiesSettings(player) {
        let form = new ModalFormData();
        form.title("Ghost Bodies Settings");

        form.divider();

        let ghostBodiesEnabled = ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;
        form.toggle("Enable Ghost Bodies", { defaultValue: ghostBodiesEnabled }); // 1
        form.label("When someone dies, regardless of role, a ghostly outline is left in their place.");
        
        form.divider();
        
        let currentViewRoles = ScoreboardManager.getTrackedObjective("settings.ghost_bodies.visibility");
        // 4
        form.dropdown("Ghost Body Visibility", ["None", "Murderers", "Neutral-Killers", "All Killers", "All"], { defaultValueIndex: currentViewRoles });
        // form.label("Requires GHOST BODIES: ON.");
        form.label("The roles that can see ghost bodies, in addition to role-specific players. All Killers includes Murderers and Neutral Killers. All enables all roles.");
        
        form.divider();
        
        let deadSeeGhosts = ScoreboardManager.getTrackedObjective("settings.ghost_bodies.dead_players_can_see") != 0;
        form.toggle("Dead Players Can See Ghost Bodies", { defaultValue: deadSeeGhosts }); // 7
        form.label("When enabled, dead players can see ghost bodies, regardless of their roles when alive.");

        form.divider();

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            // player.sendMessage('' + r.formValues[1]);
            ScoreboardManager.setTrackedObjective("settings.ghost_bodies.enabled", r.formValues[1] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.ghost_bodies.visibility", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("settings.ghost_bodies.dead_players_can_see", r.formValues[7] ? 1 : 0);
            // ScoreboardManager.setTrackedObjective("settings.role_guessing.death_on_guess", r.formValues[8]);
            this.openGameManagementSettings(player);
        });
    }

    static _openExtraMechanicsSettings(player) {
        let form = new ModalFormData();
        form.title("Extra Mechanics Settings");

        form.divider();
        form.label("Here there are a variety of miscellaneous mechanics that don't fit anywhere else.");
        form.divider();

        let knockoutOptions = ["Off", "Roles", "Modifiers", "Roles & Modifiers"];
        let knockoutMode = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.knockout_mode");
        form.dropdown("Knockout Mode", knockoutOptions, { defaultValueIndex: knockoutMode }); // 3
        form.label("After the game is over, the roles/modifiers from the round will be disabled so they cannot be rolled again. Recommended to turn on most roles/modifiers to use this.");
        
        form.divider();
        
        // 4
        form.label("Opening Game Protection\nIf a player dies within the game opening protection time, the following round they will gain 2 extra hearts for the start of the game. Both timer values can be set.");
        
        let protectionEnabled = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.protection_enabled") != 0;
        form.toggle("Opening Protection Enabled", { defaultValue: protectionEnabled }); // 7
        form.label("If true, opening protection will be applied to players who die early.");
        
        let protectionMaxTime = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.protection_time");
        form.slider("Opening Game Length", 10, 100, { valueStep: 5, defaultValue: protectionMaxTime }); // 9
        form.label("How long the opening of the game is considered, in minutes * 10 (45 would be 4.5 minutes). If a player dies in this time, the player will get protection next round.");
        
        let protectionDuration = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.protection_duration");
        form.slider("Protection Duration", 10, 100, { valueStep: 5, defaultValue: protectionDuration }); // 11
        form.label("The amount of time a player gets health boost (protection), in minutes * 10 (45 would be 4.5 minutes).");

        let protectionEndsEarly = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.protection_ends_early") != 0;
        form.toggle("Protection Ends Early", { defaultValue: protectionEndsEarly }); // 11
        form.label("If true, everyone's health boost will be cleared after the first death, even if the effect has not expired.");

        form.divider();

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("settings.extra_mechanics.knockout_mode", r.formValues[3]);
            ScoreboardManager.setTrackedObjective("settings.extra_mechanics.protection_enabled", r.formValues[7] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.extra_mechanics.protection_time", r.formValues[9]);
            ScoreboardManager.setTrackedObjective("settings.extra_mechanics.protection_duration", r.formValues[11]);
            ScoreboardManager.setTrackedObjective("settings.extra_mechanics.protection_ends_early", r.formValues[13] ? 1 : 0);
            this.openGameManagementSettings(player);
        });
    }

    /**
     * 
     * @param {Player} player 
     */
    static openRoleDescription(player, callback) {
        let playerRole = RoleManager.getPlayerRole(player);
        if (playerRole != null) {
            let form = new ModalFormData();
            form.title("Role/Modifier Description");
            
            form.divider();
            form.label("§lRole - " + Util.removeColorCodes(playerRole.getDisplayName()));
            form.label("§lRole Description");
            form.label(Util.removeColorCodes(playerRole.getRoleHelpDescription()));
            
            // form.label("");
            form.label("§lRole Config");
            form.label(playerRole.getRoleInformation());

            let modifiersEnabled = ScoreboardManager.getTrackedObjective("settings.modifiers.enabled") != 0;
            if (modifiersEnabled) {
                form.divider();
                let playerMod = ModifierManager.getPlayerModifier(player);
                if (playerMod != null) {
                    form.label("§lModifier - " + Util.removeColorCodes(playerMod.getDisplayName()));
                    form.label("§lModifier Description");
                    form.label(Util.removeColorCodes(playerMod.getModifierHelpDescription()));
                    
                    // form.label("");
                    form.label("§lModifier Config");
                    form.label(playerMod.getModifierInformation());
                }
                else {
                    form.label("Modifier - None");
                }
            }

            form.show(player).then((r) => {
                if (r.canceled) {
                    return;
                }
                if (callback != null) {
                    callback(player);
                }
            });
            // player.sendMessage(playerRole.getRoleHelpDescription());
        }
    }

    /**
     * 
     * @param {Player} player 
     */
    static openPlayerSettings(player) {
        let form = new ActionFormData();
        form.title("Player Settings");
        form.body("Here you can see game settings and modify your player settings.");

        form.button("Current Role/Modifier Help");
        form.button("Role Settings");
        form.button("Modifier Settings");
        form.button("Custom Sound Settings");
        form.button("Game Settings");
        form.button("View Game Log");
        form.button("View Player Stats");
        form.button(player.hasTag("AFK") ? "Return from AFK" : "Go AFK");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            switch (r.selection) {
                case 0: // role help
                    SettingsHandler.openRoleDescription(player, SettingsHandler.openPlayerSettings);
                    break;
                case 1: // role settings
                    SettingsHandler._showPlayerRoleInformation(player);
                    break;
                case 2: // modifier settings
                    SettingsHandler._showPlayerModifierInformation(player);
                    break;
                case 3: // sound settings
                    SettingsHandler._showPlayerSoundSettings(player);
                    break;
                case 4: // game settings
                    SettingsHandler._viewGameSettings(player);
                    break;
                case 5: // game log
                    LogManager.openLogForm(player);
                    // SettingsHandler.openRoleDescription(player, SettingsHandler.openPlayerSettings);
                    break;
                case 6: // player stats
                    // player stats
                    PlayerStatsHandler.openPlayerStatsForm(player, SettingsHandler.openPlayerSettings);
                    break;
                case 7: // afk
                    if (player.hasTag("AFK")) {
                        player.removeTag("AFK");
                        world.sendMessage(player.name + " is back from being AFK");
                    }
                    else {
                        player.addTag("AFK");
                        world.sendMessage(player.name + " is now AFK");
                    }
                    SettingsHandler.openPlayerSettings(player);
                    break;
            }
        });
    }

    static _showPlayerRoleInformation(player) {
        let form = new ActionFormData();

        form.title("View Role Settings");
        form.body("Select a category of enabled roles to view.");
        form.button("Enabled Roles");
        form.button("Innocent Roles");
        form.button("Murderer Roles");
        form.button("Neutral Independent Roles");
        form.button("Neutral Killer Roles");
        form.button("All Roles");
        form.button("Back");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            let enabledRoles = RoleManager.getEnabledRoles();
            let formName = "";
            let rolesToShow = [];
            switch (r.selection) {
                case 0: // enabled
                    formName = "";
                    rolesToShow = enabledRoles;
                    break;
                case 1: // innocent
                    formName = "Innocent ";
                    rolesToShow = enabledRoles.filter((role) => role.getAlignment() == RoleAlignment.INNOCENT);
                    break;
                case 2: // murderer
                    formName = "Murderer ";
                    rolesToShow = enabledRoles.filter((role) => role.getAlignment() == RoleAlignment.MURDERER);
                    break;
                case 3: // Neutral Independent
                    formName = "Neutral Independent ";
                    rolesToShow = enabledRoles.filter((role) => role.getAlignment() == RoleAlignment.NEUTRAL_INDEPENDENT);
                    break;
                case 4: // Neutral Killer
                    formName = "Neutral Killer ";
                    rolesToShow = enabledRoles.filter((role) => role.getAlignment() == RoleAlignment.NEUTRAL_KILLER);
                    break;
                case 5: // all roles
                    formName = "";
                    rolesToShow = RoleManager.getRoles();
                    break;
                case 6: // back
                    this.openPlayerSettings(player);
                    return;
            }

            this._showPlayerInformationOfRoles(player, formName, rolesToShow);
        });
    }

    /**
     * 
     * @param {*} player 
     * @param {string} roleSettingName 
     * @param {*} roles 
     */
    static _showPlayerInformationOfRoles(player, roleSettingName, roles) {
        let form = new ModalFormData();
        form.title("Current " + roleSettingName + "Role Settings");
        form.label("These are the currently enabled " + roleSettingName.toLowerCase() + "roles and their current settings.");

        roles.forEach((role) => {
            form.divider();
            form.label(role.getDisplayName() + "§r\n" + role.getRoleInformation());
        });

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            this._showPlayerRoleInformation(player);
        });
    }

    static _showPlayerModifierInformation(player) {let form = new ActionFormData();
        form.title("View Modifier Settings");
        form.body("Select a category of enabled modifiers to view.");
        form.button("All Enabled Modifiers");
        form.button("Universal Modifiers");
        form.button("Non-Killer Modifiers");
        form.button("Killer Modifiers");
        form.button("Murderer Modifiers");
        form.button("All Modifiers");
        form.button("Back");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            let enabledModifiers = ModifierManager.getEnabledModifiers();
            let formName = "";
            let modifiersToShow = [];
            switch (r.selection) {
                case 0: // all
                    formName = "Enabled ";
                    modifiersToShow = enabledModifiers;
                    break;
                case 1: // general
                    formName = "Universal ";
                    modifiersToShow = enabledModifiers.filter((mod) => mod.getModifierAlignment() == ModifierAlignment.ALL);
                    break;
                case 2: // non-killer
                    formName = "Non-Killer ";
                    modifiersToShow = enabledModifiers.filter((mod) => mod.getModifierAlignment() == ModifierAlignment.NON_KILLER);
                    break;
                case 3: // killer
                    formName = "Killer ";
                    modifiersToShow = enabledModifiers.filter((mod) => mod.getModifierAlignment() == ModifierAlignment.KILLERS);
                    break;
                case 4: // murderer
                    formName = "Murderer ";
                    modifiersToShow = enabledModifiers.filter((mod) => mod.getModifierAlignment() == ModifierAlignment.MURDERER);
                    break;
                case 5: // all
                    formName = "";
                    modifiersToShow = ModifierManager.getModifiers();
                    break;
                case 6: // back
                    this.openPlayerSettings(player);
                    return;
            }

            this._showPlayerInformationOfModifiers(player, formName, modifiersToShow);
        });
    }

    static _showPlayerInformationOfModifiers(player, modifierSettingName, modifiers) {
        let form = new ModalFormData();
        form.title("Current " + modifierSettingName + "Modifier Settings");
        form.label("These are the currently enabled " + modifierSettingName.toLowerCase() + "modifiers and their current settings.");

        modifiers.forEach((mod) => {
            form.divider();
            form.label(mod.getDisplayName() + "§r\n" + mod.getModifierInformation());
        });

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            this._showPlayerModifierInformation(player);
        });
    }

    static _showPlayerGameInformation(player) {
        
    }

    /**
     * 
     * @param {Player} player 
     */
    static _showPlayerSoundSettings(player) {
        let form = new ActionFormData();
        form.title("Sound Settings");
        // form.divider(); // 0
        form.body("Edit your custom sound settings here. Anything changed here will only affect your settings."); // 1

        form.button("Personal Sound Settings");
        form.button("Edit Custom Sounds");
        form.button("Back");

        let customPacks = SoundManager.getSoundPacksFromPlayer(player);
        // customPacks.forEach((pack) => {
        //     form.button({rawtext:[{translate:pack.getPath()}]}, () => {
        //         SoundManager.openPackSettings(player, pack);
        //     });
        // });

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            switch (r.selection) {
                case 0: // edit weights
                    SettingsHandler._showPlayerSoundWeights(player);
                    break;
                case 1: // edit custom sounds
                    SettingsHandler._showPlayerSoundPacks(player);
                    break;
                case 2: // back
                    SettingsHandler.openPlayerSettings(player);
                    break;
            }
        });
    }

    static _showPlayerSoundWeights(player) {
        let form = new ModalFormData();
        form.divider(); // 0
        form.label("Edit the weights and opt in/out of the sound system"); // 1

        let optInOptions = ["Synced", "Custom", "Opt-Out"];
        let currentOptSetting = ScoreboardManager.getScoreboardObjective(player, "player.sound.sound_settings");
        form.dropdown("Player Setting Type", optInOptions, {defaultValueIndex:currentOptSetting}); // 2
        let volume = ScoreboardManager.getScoreboardObjective(player, "player.sound.volume");
        let sfxVolume = ScoreboardManager.getScoreboardObjective(player, "player.sound.sfx_volume");
        form.slider("Music Volume", 0, 200, { valueStep: 5, defaultValue: volume}); // 3
        form.slider("SFX Volume", 0, 200, { valueStep: 5, defaultValue: sfxVolume}); // 3

        form.divider();
        
        let builtinWeight = ScoreboardManager.getScoreboardObjective(player, "settings.sound.builtin_chance");
        let mapWeight = ScoreboardManager.getScoreboardObjective(player, "settings.sound.map_chance");
        let customWeight = ScoreboardManager.getScoreboardObjective(player, "settings.sound.custom_chance");
        let delayMin = ScoreboardManager.getScoreboardObjective(player, "settings.sound.song_delay_min");
        let delayMax = ScoreboardManager.getScoreboardObjective(player, "settings.sound.song_delay_max");
        
        if (currentOptSetting == 0) {
            builtinWeight = ScoreboardManager.getTrackedObjective("settings.sound.builtin_chance");
            mapWeight = ScoreboardManager.getTrackedObjective("settings.sound.map_chance");
            customWeight = ScoreboardManager.getTrackedObjective("settings.sound.custom_chance");
            delayMin = ScoreboardManager.getTrackedObjective("settings.sound.song_delay_min");
            delayMax = ScoreboardManager.getTrackedObjective("settings.sound.song_delay_max");
        }

        form.slider("Builtin Pack Weight", 0, 20, {defaultValue: builtinWeight}); // 5
        form.slider("Map Pack Weight", 0, 20, {defaultValue: mapWeight}); // 6
        form.slider("Custom Pack Weight", 0, 20, {defaultValue: customWeight}); // 7
        form.label("Map sound pack " + (SoundManager.mapSoundPack != null ? "exists" : "does not exist, so map will be forced to 0 in rolling"));
        
        form.label("The following is the amount of time between songs being queued.");
        form.slider("Song Queue Delay Min", 0, 60, {defaultValue: delayMin}); // 10
        form.slider("Song Queue Delay Max", 0, 60, {defaultValue: delayMax}); // 11
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setScoreboardObjective(player, "player.sound.sound_settings", r.formValues[2]);
            ScoreboardManager.setScoreboardObjective(player, "player.sound.volume", r.formValues[3]);
            ScoreboardManager.setScoreboardObjective(player, "player.sound.sfx_volume", r.formValues[4]);

            if (r.formValues[2] == 1) {
                ScoreboardManager.setScoreboardObjective(player, "settings.sound.builtin_chance", r.formValues[6]);
                ScoreboardManager.setScoreboardObjective(player, "settings.sound.map_chance", r.formValues[7]);
                ScoreboardManager.setScoreboardObjective(player, "settings.sound.custom_chance", r.formValues[8]);
                
                let newMin = r.formValues[11];
                let newMax = Math.max(r.formValues[12], newMin);
                ScoreboardManager.setScoreboardObjective(player, "settings.sound.song_delay_min", newMin);
                ScoreboardManager.setScoreboardObjective(player, "settings.sound.song_delay_max", newMax);
            }

            SettingsHandler._showPlayerSoundSettings(player);
        });
    }

    static _showPlayerSoundPacks(player) {
        let form = new ActionFormData();
        
        form.title("Custom Sound Packs");
        form.body("To add new sound packs via import, please use the '/umm:import_pack' command");

        let soundPacks = SoundManager.getSoundPacksFromPlayer(player);
        // player.sendMessage(soundPacks.length + " ");
        // if (soundPacks)
        soundPacks.forEach((pack) => {
            form.button(pack.packName + "");
        });

        form.button("Add New Pack");
        form.button("Back");
        let packCount = soundPacks.length;

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            let packIndex = r.selection;
            if (packIndex < packCount) {
                let packToEdit = soundPacks[packIndex];
                packToEdit.packIndex = packIndex;
                player.sendMessage("Index: " + packIndex + ", Pack Name: " + packToEdit.packName);
                SoundManager.openPackSettings(player, packToEdit);
                return;
            }
            else if (packIndex == packCount) { // new pack
                let newPack = new SoundPack("", PackTypes.CUSTOM);
                newPack.packIndex = packIndex;
                SoundManager.registerPackToPlayer(player, newPack);
                SoundManager.openPackSettings(player, newPack);
                return;
            }
            
            SettingsHandler._showPlayerSoundSettings(player);
        });

    }

    static _viewGameSettings(player) {
        let form = new ActionFormData();
        form.title("View Game Settings");
        form.body("Here you can view the settings for the game.");
        form.divider();

        form.button("Role Game Settings");
        form.button("Modifier Game Settings");
        form.button("Misc Game Settings");
        form.button("Back");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            switch (r.selection) {
                case 0:
                    SettingsHandler._viewRoleGameSettings(player);
                    return;
                case 1:
                    SettingsHandler._viewModifierGameSettings(player);
                    return;
                case 2:
                    SettingsHandler._viewMiscGameSettings(player);
                    return;
                case 3:
                    break;
            }

            SettingsHandler.openPlayerSettings(player);
        });
    }

    static _viewRoleGameSettings(player) {
        let form = new ModalFormData();

        form.title("Role Game Settings");
        form.divider();
        form.label("The current player role settings:");
        
        let murdererCountMin = ScoreboardManager.getTrackedObjective("assignment.murderer_count.min");
        let murdererCountMax = ScoreboardManager.getTrackedObjective("assignment.murderer_count.max");
        let randomMurderersMin = ScoreboardManager.getTrackedObjective("assignment.random_murderers.min");
        let randomMurderersMax = ScoreboardManager.getTrackedObjective("assignment.random_murderers.max");
        let randomNIMin = ScoreboardManager.getTrackedObjective("assignment.random_neutral_independents.min");
        let randomNIMax = ScoreboardManager.getTrackedObjective("assignment.random_neutral_independents.max");
        let randomNKMin = ScoreboardManager.getTrackedObjective("assignment.random_neutral_killers.min");
        let randomNKMax = ScoreboardManager.getTrackedObjective("assignment.random_neutral_killers.max");
        let randomInnocentsMin = ScoreboardManager.getTrackedObjective("assignment.random_innocents.min");
        let randomInnocentsMax = ScoreboardManager.getTrackedObjective("assignment.random_innocents.max");

        form.label("Murderer Count: " + murdererCountMin + "-" + murdererCountMax);
        form.label("Random Murderer (role) Count: " + randomMurderersMin + "-" + randomMurderersMax);
        form.label("Random Neutral Independent Count: " + randomNIMin + "-" + randomNIMax);
        form.label("Random Neutral Killer Count: " + randomNKMin + "-" + randomNKMax);
        form.label("Random Innocent Count: " + randomInnocentsMin + "-" + randomInnocentsMax);

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler._viewGameSettings(player);
        });
    }

    static _viewModifierGameSettings(player) {
        let form = new ModalFormData();

        form.title("Modifier Game Settings");
        form.divider();
        form.label("The current player modifier settings:");
        
        let modifiersEnabled = ScoreboardManager.getTrackedObjective("settings.modifiers.enabled") != 0;
        let modifierChance = ScoreboardManager.getTrackedObjective("settings.modifiers.modifier_chance");
        let maxCountMin = ScoreboardManager.getTrackedObjective("settings.modifiers.max_modifier_count_min");
        let maxCountMax = ScoreboardManager.getTrackedObjective("settings.modifiers.max_modifier_count_max");
        let murdererModChance = ScoreboardManager.getTrackedObjective("settings.modifiers.murderer_modifier_chance");
        let neutralKModChance = ScoreboardManager.getTrackedObjective("settings.modifiers.neutral_killer_modifier_chance");
        let neutralIModChance = ScoreboardManager.getTrackedObjective("settings.modifiers.neutral_independent_modifier_chance");
        let innocentModChance = ScoreboardManager.getTrackedObjective("settings.modifiers.innocent_modifier_chance");

        form.label("Modifiers Enabled: " + modifiersEnabled);
        form.label("Base Modifier Chance: " + modifierChance);
        form.label("Max Modifiers: " + maxCountMin + "-" + maxCountMax);
        form.label("Murderer Mod Chance: " + murdererModChance);
        form.label("Neutral Killer Mod Chance: " + neutralKModChance);
        form.label("Neutral Independent Mod Chance: " + neutralIModChance);
        form.label("Innocent Mod Chance: " + innocentModChance);

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler._viewGameSettings(player);
        });
    }

    static _viewMiscGameSettings(player) {
        let form = new ModalFormData();

        form.title("All Game Settings");
        form.divider();

        let assignmentTypes = ["Off", "Dispenser", "Automatic"];
        let currentAssignmentType = ScoreboardManager.getTrackedObjective("settings.role_assignment.enabled");
        form.label("§lRole Assignment");
        form.label("Assignment Type: " + assignmentTypes[currentAssignmentType]);
        
        form.divider();

        let draftEnabled = ScoreboardManager.getTrackedObjective("settings.role_draft.enabled") != 0;
        let draftOptions = ScoreboardManager.getTrackedObjective("settings.role_draft.option_count");
        let timeToChoose = ScoreboardManager.getTrackedObjective("settings.role_draft.time_to_choose");
        let duplicatesEnabled = ScoreboardManager.getTrackedObjective("settings.role_draft.can_have_duplicates") != 0;
        let includeBaseRoles = ScoreboardManager.getTrackedObjective("settings.role_draft.include_base_roles") != 0;
        form.label("§lRole Draft");
        form.label("Role Draft Enabled: " + draftEnabled);
        form.label("Draft Options: " + draftOptions);
        form.label("Time to Choose Option: " + timeToChoose + " seconds.");
        form.label("Duplicates Allowed: " + duplicatesEnabled);
        form.label("Include Basic Roles: " + includeBaseRoles);

        form.divider();
        
        let roleGuessingEnabled = ScoreboardManager.getTrackedObjective("settings.role_guessing.enabled") != 0;
        let roleGuessCooldown = ScoreboardManager.getTrackedObjective("settings.role_guessing.guess_cooldown");
        let roleGuessCount = ScoreboardManager.getTrackedObjective("settings.role_guessing.murderer_guess_count");
        let canGuessModifiers = ScoreboardManager.getTrackedObjective("settings.role_guessing.can_guess_modifiers") != 0;
        let guessingKills = ScoreboardManager.getTrackedObjective("settings.role_guessing.death_on_guess") != 0;
        form.label("§lRole Guessing")
        form.label("Role Guessing Enabled: " + roleGuessingEnabled);
        form.label("Role Guess Cooldown: " + roleGuessCooldown + " seconds.");
        form.label("Role Guess Count: " + roleGuessCount);
        form.label("Can Guess Modifiers: " + canGuessModifiers);
        form.label("Failed Guess Kills: " + guessingKills);

        form.divider();
        
        let winConEnabled = ScoreboardManager.getTrackedObjective("settings.win_con_management.enabled") != 0;
        let tellAllRoles = ScoreboardManager.getTrackedObjective("settings.win_con_management.tell_roles_after") != 0;
        form.label("§lWin Condition Management");
        form.label("Win Con Management Enabled: " + winConEnabled);
        form.label("Tell Roles After Game: " + tellAllRoles);

        form.divider();
        
        let bookPassOn = ScoreboardManager.getTrackedObjective("settings.book_pass.enabled") != 0;
        let bookPassType = ScoreboardManager.getTrackedObjective("settings.book_pass.copy_type");
        form.label("§lBook Pass");
        form.label("Book Pass Enabled: " + bookPassOn);
        form.label("Book Pass Copy Type: " + ["Murderer", "Random Murderer Role", "Exact Copy"][bookPassType]);

        form.divider();
        
        let deathHandlingEnabled = ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
        let tellKillerEnabled = ScoreboardManager.getTrackedObjective("settings.death_handling.tell_killer") != 0;
        let tellKillerRoleEnabled = ScoreboardManager.getTrackedObjective("settings.death_handling.tell_killer_role") != 0;
        let roleShowingEnabled = ScoreboardManager.getTrackedObjective("settings.death_handling.tell_roles") != 0;
        let playersAliveEnabled = ScoreboardManager.getTrackedObjective("settings.death_handling.tell_who_is_living") != 0;
        let deadPlayersGetMessages = ScoreboardManager.getTrackedObjective("settings.death_handling.dead_players_receive_all_chat_messages") != 0;
        form.label("§lDeath Handling");
        form.label("Death Handling Enabled: " + deathHandlingEnabled);
        form.label("Tell Killer: " + tellKillerEnabled);
        form.label("Tell Killer Role: " + tellKillerRoleEnabled);
        form.label("Tell Roles: " + roleShowingEnabled);
        form.label("Tell Living Players: " + playersAliveEnabled);
        form.label("Dead Players Receive Chat Messages: " + deadPlayersGetMessages);

        form.divider();

        let ghostBodiesEnabled = ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;
        let currentViewRoles = ScoreboardManager.getTrackedObjective("settings.ghost_bodies.visibility");
        let deadSeeGhosts = ScoreboardManager.getTrackedObjective("settings.ghost_bodies.dead_players_can_see") != 0;
        form.label("§lGhost Bodies");
        form.label("Ghost Bodies Enabled: " + ghostBodiesEnabled);
        form.label("Ghost Visibility: " + ["None", "Murderers", "Neutral-Killers", "All Killers", "All"][currentViewRoles]);
        form.label("Dead Players See Ghosts: " + deadSeeGhosts);

        form.divider();
        
        let chatEnabled = ScoreboardManager.getTrackedObjective("role_settings.murderer.murderer_chat") != 0;
        let settings = ["Innocents", "Neutral Independents & Innocents", "Non-Murderers"];
        let guessSettings = ScoreboardManager.getTrackedObjective("settings.role_guessing.murderer_guess_type");
        form.label("§lMurderer Settings");
        form.label("Murderer Chat Enabled: " + chatEnabled);
        form.label("Guess Roles: " + settings[guessSettings]);
        
        let knockoutOptions = ["Off", "Roles", "Modifiers", "Roles & Modifiers"];
        let knockoutMode = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.knockout_mode");
        let protectionEnabled = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.protection_enabled") != 0;
        let protectionMaxTime = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.protection_time");
        let protectionDuration = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.protection_duration");
        let protectionEndsEarly = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.protection_ends_early") != 0;
        form.label("§lExtra Mechanics Settings");
        form.label("Knockout Mode: " + knockoutOptions[knockoutMode]);
        form.label("Protection Enabled: " + protectionEnabled);
        form.label("Opening Game Time: " + (protectionMaxTime / 10) + " minutes");
        form.label("Protection Duration: " + (protectionDuration / 10) + " minutes");
        form.label("Protection Ends First Death: " + protectionEndsEarly);

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler._viewGameSettings(player);
        });
    }

    // showFunctionSelector() {
    //     let form = new ActionFormData();
    //     form.title("Guess Player");
    //     form.body("Select the player you want to guess the role of.");

    //     let pd = new PlayerIconData();

    //     let players = world.getAllPlayers();
    //     players.forEach((i) => {
    //         form.button(i.name, pd.data[i.name.charAt(0).toLowerCase()]);
    //     });

    //     form
    //         .show(this.player)
    //         .then((r) => {
    //             if (r.canceled) return;

    //             let response = r.selection;
    //         })
    //         .catch((e) => {
    //             console.error(e, e.stack);
    //         });
    // }
}