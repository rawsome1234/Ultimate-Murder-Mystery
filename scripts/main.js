"use strict";

import { world, system, Player, ItemStack, CustomCommandParamType, CommandPermissionLevel, EnchantmentType, EntityDamageCause, GameMode, Scoreboard, Difficulty, InputPermissionCategory } from "@minecraft/server";
import { GameStates, ScoreboardManager } from "./scoreboard_manager";
import { RoleAlignment, RoleTypes } from "./role";
import { RoleManager } from "./role_manager";
import { RoleAssignment } from "./role_assignment";
import { SettingsHandler } from "./settings_handler";
import { GuessingManager } from "./guessing_manager";
import { GhostManager } from "./ghost_manager";
import { PlayerHandler } from "./player_handler";
import { WinConditionManager } from "./win_con_handler";
import { DeathHandler } from "./death_handler";
import { ChatManager } from "./chat_manager";
import { MurdererRole } from "./roles/murderer";
import { SoundEffectType, SoundManager } from "./sound_manager";
import { PackTypes, SoundPack } from "./sound/pack";
import { PortalManager } from "./portal_manager";
import { ModifierManager } from "./modifier_manager";
import { ModifierAssignment } from "./modifier_assignment";
import { Util } from "./util";
import { PresetManager } from "./preset_manager";
import { InputManager } from "./input_manager";
import { RoleDraft } from "./role_draft";
import { PlayerStatsHandler } from "./player_stats";
import { LogManager } from "./log_manager";
import { LogItemType } from "./logs/game_log";
import { CustomRoleManager } from "./custom_role_manager";
import { BomberRole } from "./roles/bomber";
import { ExtraMechanics } from "./extra_mechanics";

// chat blocker and commands
world.beforeEvents.chatSend.subscribe(async (event) => {
    let player = event.sender;
    let message = event.message;
    event.cancel = true;
    let command = message.split(" ");
    switch (command[0]) {
        case "!reload":
            // player.sendMessage("Reloading..");
            // reload();
            break;
        case "!setup-items":
            system.run(() => {
                player.runCommand("give @s umm:settings_icon 1");
                // player.runCommand("give @s umm:start_stick 1");
                // player.runCommand("give @s umm:dispenser_stick 1");
                // player.runCommand("give @s umm:hopper_stick 1");
                // player.runCommand("give @s umm:dispenser_reset_stick 1");
                // player.runCommand("give @s umm:set_spawn_stick 1");
                // SettingsHandler.openConfig(player);
            });
            return;
        case "!reset-scoreboards":
            if (!PlayerHandler.hasUMMOp(player)) {
                break;
            }
            system.run(() => {
                ScoreboardManager.clearScoreboard();
                player.runCommand("function helpers/setup/setup_scoreboards");
                world.scoreboard.getObjectives().forEach((obj) => {
                    if (!obj.hasParticipant("game_data") || obj.getScore("game_data") == 0) {
                        // player.sendMessage(obj.id);
                    }
                });
            });
            return;
        // case "!get-role":
        //     let role = RoleManager.getPlayerRole(player);
        //     player.sendMessage("Your role alignment is " + role.getAlignment().description);
        //     break;
        case "!ghost":
            return;
            let playerLocation = player.location;
            let playerDim = player.dimension;
            system.run(() => {
                GhostManager.addGhost(playerLocation, playerDim.id, player);
            });
            return;
        case "!player-id":
            player.sendMessage("" + ScoreboardManager.getScoreboardObjective(player, "player.player_id"));
            return;
        case "!give-role":
            if (!PlayerHandler.hasUMMOp(player)) {
                break;
            }
            let bookID = command[1];
            let customID = command.length > 2 ? command[2] : null;
            let bookRole = RoleManager.getMatchingRole(bookID, customID);
            system.run(() => {
                player.getComponent("minecraft:inventory").container.addItem(RoleAssignment._createBookForRole(bookRole));
            });
            return;
        case "!help":
            let remainingCommand = message.substring("!help ".length);
            if (remainingCommand != "") {
                let allRoles = RoleManager.getRoles();
                for (let i = 0; i < allRoles.length; i++) {
                    let role = allRoles[i];
                    // player.sendMessage("Checking role " + Util.removeColorCodes(role.getDisplayName()).toLowerCase());
                    if (Util.removeColorCodes(role.getDisplayName()).toLowerCase() == remainingCommand.toLowerCase()) {
                        player.sendMessage(role.getDisplayName() + ": " + role.getRoleHelpDescription());
                        return;
                    }
                }
                player.sendMessage("\"" + remainingCommand + "\" is not a valid role name!");
                return;
            }

            if (player.hasTag("AFK") || DeathHandler.consideredDead(player)) {
                DeathHandler.sendPlayerRolesAliveMessages(player);
                return;
            }

            system.runTimeout(() => {
                SettingsHandler.openRoleDescription(player, null);
            }, 40);
            player.sendMessage("Please close your chat.");
            return;
        case "!log":
            if (player.hasTag("AFK") || DeathHandler.consideredDead(player)) {
                system.runTimeout(() => {
                    LogManager.openLogForm(player);
                }, 40);
                player.sendMessage("Please close your chat.");
            }
            return;
        case "!version":
            player.sendMessage("Current UMM Version is §lv1.0.0dev");
            return;
        case "!dev-music":
            if (PlayerHandler.getWorldOwner().id != player.id) {
                player.sendMessage("You are not the world owner");
                return;
            }
            let devMusicString = '[{"conditions":[],"path":"umm.builtin.music_lovers","weight":5,"song_duration":107},{"conditions":[],"path":"umm.builtin.music_eight_regret","weight":3,"song_duration":124},{"conditions":[],"path":"umm.builtin.music_resting_grounds","weight":3,"song_duration":132},{"conditions":[],"path":"umm.builtin.music_reflection","weight":3,"song_duration":99},{"conditions":["l<=50"],"path":"umm.builtin.music_dream","weight":3,"song_duration":121},{"conditions":[],"path":"umm.builtin.music_white_lady","weight":1,"song_duration":79},{"conditions":[],"path":"umm.builtin.music_catch_us_now","weight":3,"song_duration":114},{"conditions":[],"path":"umm.builtin.music_genetic_code","weight":2,"song_duration":147}]';
            let builtinPack = SoundManager.builtinPack;
            SoundManager._importSongList(builtinPack, JSON.parse(devMusicString));
            let exportPack = builtinPack.convertToSave();
            let armorStand = SoundManager.getSoundSaveStand();
            armorStand.setDynamicProperty(SoundManager.BUILTIN_PACK_TAG, exportPack);
            player.sendMessage("§oImported dev songs");
            return;
        case "!unfreeze":
            if (!PlayerHandler.hasUMMOp(player)) {
                break;
            }
            ScoreboardManager.setScoreboardObjective(player, "role_settings.cryomancer.freeze_timer", 0);
            player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
            player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, true);
        case "!end-draft":
            system.run(() => {
                RoleDraft.endDraft(false);
            });
            return;
        case "!test":
            if (!PlayerHandler.hasUMMOp(player)) {
                break;
            }

            system.run(() => {
                // PresetManager._loadObjectivesIntoMap()
                // player.spawnParticle("umm:ecto_blast", PlayerHandler.addVectors(player.location, {x:0,y:2,z:0}));
                // player.sendMessage(JSON.stringify(RoleManager.getRoles().map((r) => r.getDisplayName())));
                // world.getAllPlayers().forEach((pl) => {
                //     pl.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
                //     pl.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, true);
                // });
                // player.sendMessage(CustomRoleManager.customRoles[0].roleCustomData.alignmentID + "");
                // if (command.length == 1) {
                //     return;
                // } 
                // let role = RoleManager.searchForRole(command[1], command.length == 2 ? -1 : command[2]);
                // player.sendMessage("Found role: " + (role ? role.getDisplayName() : "null"));
                // return;
                // GamblerModifier.activateEffect(player, GamblerResults.ABOUT_FACE);
                // PlagueBearerRole.infectPlayer(player);
                // SoundManager.playSoundEffect([player], SoundEffectType.STALKER_AMBIENCE);
                // SoundManager.playSoundEffect([player], SoundEffectType.DISPERSER_WARP);
                // ScoreboardManager.setScoreboardObjective(player, "player.sound.sfx_volume", 50);
                // GuessingManager.killGuessedPlayer(player);
                // ArtemisRole.checkForWin(player);
                // OfficerRole.addCampedPlayer(player, player);
                // RoleDraft.endDraft();
                // RoleAssignment.setPlayerRole(player, RoleManager.getMatchingRole(3));
                RoleDraft.clearOfRoleDraftItems(player);
                
                // let roleDraftOptionItem = RoleDraft.createRoleDraftItem(null);
                // let iconComponent = roleDraftOptionItem.getComponent("minecraft:icon");
                // player.sendMessage("" + (iconComponent != null));
                // player.getComponent("minecraft:inventory").container.addItem(roleDraftOptionItem);
                // roleDraftOptionItem.getComponents().forEach((comp) => {
                //     player.sendMessage(comp.typeId);
                // });
                // RoleDraft.loadPlayerHotbar(player);
                // player.startItemCooldown("minecraft:/", 100);
                // player.sendMessage(Util.removeColorCodes("§bCryomancer"));
                // CryomancerRole.addPlayerToCryoTag(player, player);
                // let jsonData = PresetManager.savePaths(world.scoreboard.getObjectives().map((obj) => obj.id), "");
                // player.sendMessage(JSON.stringify(jsonData));
                // let jsonData = new Object();
                // jsonData["role_settings"] = {"glitch": {"enabled": 1}};
                // PresetManager.loadPaths(jsonData, "");
                // player.sendMessage(JSON.stringify(PresetManager.loadPaths()));
                
                // let serialKillers = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.SERIAL_KILLER);
                // serialKillers.forEach((killer) => {
                //     SerialKillerRole.assignTarget(killer, null);
                // });
                // player.sendMessage("Current state: " + ScoreboardManager.getGameState().name);

                // PresetManager.currentPresets.push(new Preset("My Preset", "{}"))
                // PresetManager._savePresetToArmorStand();
            });
            // system.run(() => ChatManager.givePlayerChatIdentity(player, -1, "Murderer1"));
            // system.run(() => {
            //     let allPlayers = sortPlayersWithoutTag(world.getAllPlayers(), "dead");
            //     allPlayers.forEach((pl) => pl.sendMessage("" + allPlayers.length + " alive"));

            //     // DeathHandler.updateTrackers();
            // });
            // let correctOutput = '{"pack_content": [{"conditions":["a!=m"],"path":"umm.builtin.music","weight":2,"song_duration":107}], "pack_name": "Builtin Pack"}';
            // correctOutput = correctOutput.replace(" ", "");
            // let testPack = new SoundPack(correctOutput);
            // testPack.getSong(1, RoleAlignment.INNOCENT, 2, 2);
            // let testOutput = testPack.convertToSave();
            // system.run(() => {
            //     player.setDynamicProperty("sound_test", '{"pack_content":[{"conditions":[],"path":"umm.builtin.music_lovers","weight":5,"song_duration":107},{"conditions":[],"path":"umm.builtin.music_eight_regret","weight":3,"song_duration":124},{"conditions":[],"path":"umm.builtin.music_resting_grounds","weight":3,"song_duration":132},{"conditions":[],"path":"umm.builtin.music_reflection","weight":3,"song_duration":99},{"conditions":["l<=50"],"path":"umm.builtin.music_dream","weight":3,"song_duration":121},{"conditions":[],"path":"umm.builtin.music_white_lady","weight":1,"song_duration":79},{"conditions":[],"path":"umm.builtin.music_catch_us_now","weight":3,"song_duration":114},{"conditions":[],"path":"umm.builtin.music_genetic_code","weight":2,"song_duration":147}],"pack_name":"Builtin Pack"}');
            //     player.sendMessage(player.getDynamicProperty("sound_test") + "");
            // });
            // // PortalManager.addPortal(player.location, player.dimension.id, player);
            // system.run(() => {
            //     player.addEffect("minecraft:health_boost", 20000000, {showParticles: false, amplifier: 1});
            //     // let hComp = player.getComponent("minecraft:health");
            //     // hComp.effectiveMax = 30;
            //     // hComp.setCurrentValue(30);
            // });
            // player.sendMessage(Util.randomlyObfuscate("Hello this string is obfuscated", .9));
            // system.run(() => );
            // system.run(() => world.getAllPlayers().forEach((player) => player.sendMessage("" + MurdererRole.murdererChatEnabled())));
            system.run(() => world.getAllPlayers().forEach((player) => player.startItemCooldown("role_action", 0)));
            system.run(() => world.getAllPlayers().forEach((player) => player.startItemCooldown("guessing_action", 0)));
            system.run(() => world.getAllPlayers().forEach((player) => ScoreboardManager.setScoreboardObjective(player, "player.modifier_cooldown", 0)));
            // SoundManager.queueSoundForSyncedPlayers();
            // system.runTimeout(() => {
            //     SoundManager.openPackSettings(player, SoundManager.builtinPack);
            // }, 20);

            // player.sendMessage(player.getDynamicProperty(SoundManager.soundDynamicPropertyKey));

            // system.runTimeout(() => {
                // SettingsHandler.testPlayerCustomForm(player);
            // }, 20);

            // let endLocation = { x: player.location.x + 5, y: player.location.y + 2.5, z: player.location.z + 5 };
            // world.getAllPlayers().forEach((pl) => {
                // PlayerHandler.spawnParticlesBetweenPoints(pl, player.location, endLocation, { red: 1, blue: 1, green: 0, alpha: 1 });
            // });
            // let settings = new MolangVariableMap();
            // settings.setColorRGBA('variable.color', { red: 1, blue: 0, green: 0, alpha: 1 });
            // settings.setFloat('variable.size', 5);
            // system.run(() => {
            //     player.sendMessage("Input: " + (correctOutput));
            //     player.sendMessage("Save Output: " + (testOutput));
            //     player.sendMessage("Checking if test output is equal: " + (correctOutput == testOutput));
            // });

            return;
        // case "!get-alignment":
        //     let doubleAgent = RoleManager.getPlayerRole(player);
        //     player.sendMessage("Your alignment is " + doubleAgent.getAlignment(player).description);
        //     return;
        case "!settings":
        case "!setting":
            let playerSettingsItem = new ItemStack("umm:player_settings");
            system.run(() => {
                player.addItem(playerSettingsItem);
                player.sendMessage("Right click the player settings item to open settings.");
            });
            return;
        case "!missing":
            let scoreboardsToTest = ["start_lever", "respawn_pos", "weapons_chest", "player_spectate", "player_play_block", "reset_dispenser_button", "book_dispenser", "book_hopper"];
            scoreboardsToTest = scoreboardsToTest.filter((objName) => {
                let notSet = ScoreboardManager.getTrackedObjective(objName + ".set") == 0;
                return notSet;
            });
            if (scoreboardsToTest.length == 0) {
                player.sendMessage("All config blocks have been set.");
                return;
            }
            let blockNames = scoreboardsToTest.map((blockName) => {
                if (blockName == "player_play_block") {
                    return "player location";
                }
                return blockName.replaceAll("_", " ");
            });
            player.sendMessage("The following config blocks have not been set: " + Util.formatStringList(blockNames, ", ", false));
            return;
        case "!is-op":
            player.sendMessage("You are oped: " + PlayerHandler.hasUMMOp(player));
            player.sendMessage("You are world owner: " + player.getDynamicProperty(PlayerHandler.UMM_WORLD_OWNER_PROPERTY));
            return;
        default:
            break;
    }
    ChatManager.handleChatMessage(player, message);
});

// start level flicked
world.afterEvents.leverAction.subscribe(async (event) => {
    if (ScoreboardManager.getTrackedObjective("start_lever.set") == 0) {
        return;
    }

    let player = event.player;
    // let playerItem = player
    let startLeverX = ScoreboardManager.getTrackedObjective("start_lever.x");
    let startLeverY = ScoreboardManager.getTrackedObjective("start_lever.y");
    let startLeverZ = ScoreboardManager.getTrackedObjective("start_lever.z");
    let startLeverDim = ScoreboardManager.getTrackedObjective("start_lever.dim");

    if (vectorsMatch(event.block.location, startLeverX, startLeverY, startLeverZ) && startLeverDim == dimToID(event.dimension.id)) {
        if (event.isPowered) {
            startGame();
        }
        else {
            // ScoreboardManager.setGameState(GameStates.FINISHED);
        }
        // player?.sendMessage("Lever flicked");
        // start game
    }
});

// on use item
world.beforeEvents.itemUse.subscribe(async (event) => {
    let player = event.source;
    let item = event.itemStack;
    // player.sendMessage("Using item");
    // item.getComponents().forEach((comp) => {
    //     player.sendMessage(comp.typeId);
    // });
    if (item.typeId == "umm:settings_icon") {
        if (!PlayerHandler.hasUMMOp(player)) {
            player.sendMessage("You do not have permission to use this item.");
            return;
        }
        system.run(() => {
            SettingsHandler.openConfig(player);
            // GuessingManager.openVotingMenu(player);
        });
    }
    else if (item.typeId == "umm:player_settings") {
        system.run(() => {
            SettingsHandler.openPlayerSettings(player);
        });
    }
    else if (item.typeId == "umm:guessing_action") {
        system.run(() => {
            // SettingsHandler.openConfig(player);
            GuessingManager.openVotingMenu(player);
        });
    }
    else if (item.typeId == "minecraft:iron_sword") {
        if (!ScoreboardManager.isGameRunning()) {
            // ScoreboardManager.setPlayerActionCooldown(player, 5);
            // WinConditionManager.teleportPlayerToSpawn(player);
            return;
        }
        system.run(() => {
            let skipActivation = player.getDynamicProperty("blockModifierActivationThisFrame");
            let timeLeft = InputManager.resetSwordClick(player);
            // player.sendMessage("ticks passed: " + timeLeft);
            if (skipActivation || (timeLeft > InputManager.MODIFIER_ACTIVATE_TIME && !player.isSneaking)) {
                player.setDynamicProperty("blockModifierActivationThisFrame", false);
                return;
            }
    
            let playerMod = ModifierManager.getPlayerModifier(player);
            PlayerHandler.onActionUse.resetSignal();
            PlayerHandler.onActionUse.actionUsePlayer = player;
            PlayerHandler.onActionUse.emit();
            if (!PlayerHandler.onActionUse.cancel && playerMod != null && !player.hasTag("dead") && playerMod.hasAbility(player)) {
                let cooldown = ScoreboardManager.getScoreboardObjective(player, "player.modifier_cooldown");
                if (cooldown > 0) {
                    player.sendMessage("Your modifier ability is still on cooldown for " + Math.ceil(cooldown / 20) + " seconds.");
                    return;
                }
                playerMod.activateAbility(player);
                // PlayerHandler.updateRoleActionVisual(player);
            }
        });
        // player.sendMessage("Clicked sword");
        // player.sendMessage(JSON.stringify(item.getComponents().map((comp) => comp.typeId)));
    }
    else if (item.typeId == "umm:role_action") {
        let playerRole = RoleManager.getPlayerRole(player);
        system.run(() => {
            let cooldown = player.getItemCooldown("role_action");
            if (!ScoreboardManager.isGameRunning()) {
                if (cooldown > 0) {
                    return;
                }
                ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                WinConditionManager.teleportPlayerToSpawn(player);
                return;
            }
            PlayerHandler.onActionUse.resetSignal();
            PlayerHandler.onActionUse.actionUsePlayer = player;
            PlayerHandler.onActionUse.emit();
            if (!PlayerHandler.onActionUse.cancel && playerRole != null && !player.hasTag("dead") && playerRole.canUseAbility(player)) {
                let hasInteracted = player.getDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY);
                if (hasInteracted) {
                    player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, false);
                    return;
                }
                if (cooldown > 0) {
                    player.sendMessage("Your action is still on cooldown for " + Math.ceil(cooldown / 20) + " seconds.");
                    return;
                }
                playerRole.activateAbility(player);
                PlayerHandler.updateRoleActionVisual(player);
            }
        });
    }
});

world.beforeEvents.playerInteractWithEntity.subscribe(async (event) => {
    let player = event.player;
    let target = event.target;
    let item = event.itemStack;
    if (target.typeId == "umm:technician_portal" && PortalManager.canSeePortals(player, target)) {
        PortalManager.onPortalClick(player, target);
    }
    else if (item != null && item.typeId == "minecraft:iron_sword") {
        return;
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }
        system.run(() => {
            let timeLeft = InputManager.resetSwordClick(player);
            if (timeLeft > InputManager.MODIFIER_ACTIVATE_TIME) {
                return;
            }
            
            let playerMod = ModifierManager.getPlayerModifier(player);
            PlayerHandler.onActionUse.resetSignal();
            PlayerHandler.onActionUse.actionUsePlayer = player;
            PlayerHandler.onActionUse.isInteract = true;
            PlayerHandler.onActionUse.interactTarget = target;
            PlayerHandler.onActionUse.emit();
            if (!PlayerHandler.onActionUse.cancel && playerMod != null && !player.hasTag("dead") && playerMod.hasAbility(player) && ScoreboardManager.getScoreboardObjective(player, "player.modifier_cooldown") < 0) {
                playerMod.activateAbilityOnEntity(player, target);
            }
        });
    }
    else if (item != null && item.typeId == "umm:role_action") {
        let playerRole = RoleManager.getPlayerRole(player);
        system.run(() => {
            if (!ScoreboardManager.isGameRunning()) {
                return;
            }
            PlayerHandler.onActionUse.resetSignal();
            PlayerHandler.onActionUse.actionUsePlayer = player;
            PlayerHandler.onActionUse.isInteract = true;
            PlayerHandler.onActionUse.interactTarget = target;
            PlayerHandler.onActionUse.emit();
            if (!PlayerHandler.onActionUse.cancel && playerRole != null && !player.hasTag("dead") && playerRole.canUseAbility(player) && player.getItemCooldown("role_action") <= 0) {
                playerRole.activateAbilityOnEntity(player, target);
                PlayerHandler.updateRoleActionVisual(player);
            }
        });
    }
});

world.beforeEvents.playerInteractWithBlock.subscribe(async (event) => {
    if (RoleDraft.isDraftRunning() && ScoreboardManager.getPlayerID(event.player) >= 0) {
        event.cancel = true;
        return;
    }
    // if (ScoreboardManager.getTrackedObjective("weapons_chest.set") == 0) {
    //     return;
    // }
    // let weaponsChestX = ScoreboardManager.getTrackedObjective("weapons_chest.x");
    // let weaponsChestY = ScoreboardManager.getTrackedObjective("weapons_chest.y");
    // let weaponsChestZ = ScoreboardManager.getTrackedObjective("weapons_chest.z");
    // let weaponsChestDim = ScoreboardManager.getTrackedObjective("weapons_chest.dim");
    // let weaponsChestBlock = event.block;
    // let isWeaponsChest = weaponsChestBlock.hasComponent("minecraft:inventory") && vectorsMatch(event.block.location, weaponsChestX, weaponsChestY, weaponsChestZ) && weaponsChestDim == dimToID(event.block.dimension.id)
    // if (isWeaponsChest && RoleDraft.isDraftRunning()) {
    //     event.cancel = true;
    // }
});

world.afterEvents.blockContainerOpened.subscribe(async (event) => {
    // event.block.getComponents().forEach((comp) => {
        // world.getAllPlayers().forEach((pl) => pl.sendMessage(comp.typeId));
    // })
    // world.getAllPlayers().forEach((pl) => pl.sendMessage("" + PlayerHandler.vecToString(event.block.getComponent("minecraft:inventory").)));

    if (ScoreboardManager.getTrackedObjective("weapons_chest.set") == 0) {
        return;
    }

    
    let player = event.openSource.entity;
    // player.sendMessage("Interacted with block");
    // let playerItem = player
    let weaponsChestX = ScoreboardManager.getTrackedObjective("weapons_chest.x");
    let weaponsChestY = ScoreboardManager.getTrackedObjective("weapons_chest.y");
    let weaponsChestZ = ScoreboardManager.getTrackedObjective("weapons_chest.z");
    let weaponsChestDim = ScoreboardManager.getTrackedObjective("weapons_chest.dim");
    let weaponsChestBlock = event.block;
    if (weaponsChestBlock.hasComponent("minecraft:inventory") && vectorsMatch(event.block.location, weaponsChestX, weaponsChestY, weaponsChestZ) && weaponsChestDim == dimToID(event.dimension.id)) {
        system.run(() => {
            // player.sendMessage("Filled chest");
            let weaponsChestContainer = weaponsChestBlock.getComponent("inventory").container;
            weaponsChestContainer.clearAll();
            let sword = new ItemStack("minecraft:iron_sword", 1);
            sword.getComponent("minecraft:durability").unbreakable = true;
            // sword.getComponent("minecraft:enchantable").addEnchantment({type: new EnchantmentType(""), level: 0});
            let bow = new ItemStack("minecraft:bow", 1);
            bow.getComponent("minecraft:durability").unbreakable = true;
            bow.getComponent("minecraft:enchantable").addEnchantment({type: new EnchantmentType("infinity"), level: 1});
            let arrow = new ItemStack("minecraft:arrow", 1);
            let containerSize = weaponsChestContainer.size;
            let thirdOfSize = containerSize / 3;
            for (let i = 0; i < thirdOfSize; i++) {
                weaponsChestContainer.setItem(i, sword);
            }
            for (let i = thirdOfSize; i < 2 * thirdOfSize; i++) {
                weaponsChestContainer.setItem(i, bow);
            }
            for (let i = 2 * thirdOfSize; i < 3 * thirdOfSize; i++) {
                weaponsChestContainer.setItem(i, arrow);
            }
        });
    }

});

function detectPlayerAtModeChanges() {
    system.runInterval(() => {
        // let playerItem = player
        let spectateX = ScoreboardManager.getTrackedObjective("player_spectate.x") + .5;
        let spectateY = ScoreboardManager.getTrackedObjective("player_spectate.y");
        let spectateZ = ScoreboardManager.getTrackedObjective("player_spectate.z") + .5;

        let playBlockX = ScoreboardManager.getTrackedObjective("player_play_block.x") + .5;
        let playBlockY = ScoreboardManager.getTrackedObjective("player_play_block.y");
        let playBlockZ = ScoreboardManager.getTrackedObjective("player_play_block.z") + .5;

        world.getAllPlayers().forEach((player) => {
            let playerLocation = player.location;
            // player.sendMessage("Checking if " + player.name + " is near mode changes");
            if (PlayerHandler.distanceBetweenLocations(playerLocation, {x:spectateX, y:spectateY, z:spectateZ}) < .8) {
                // player.sendMessage("setting you to Spectate mode");
                player.runCommand("gamemode spectator")
            }
            
            if (PlayerHandler.distanceBetweenLocations(playerLocation, {x:playBlockX, y:playBlockY, z:playBlockZ}) < .8 && player.getGameMode() != GameMode.Adventure) {
                player.runCommand("gamemode adventure");
                player.teleport({x:playBlockX, y:playBlockY+1, z:playBlockZ});
                // player.sendMessage("setting you to player mode");
            }
        });
    }, 2);
}

/**
 * Converts the dimension to a number for identification.
 * 
 * @param {string} dimensionID the dimension's identifier.
 * @return {number} the respective number for the dimension.
 */
function dimToID(dimensionID) {
    switch (dimensionID) {
        case "minecraft:overworld":
            return 0
        case "minecraft:nether":
            return 1
        case "minecraft:the_end":
            return 2
        default:
            return -1
    }
}

/**
 * Converts a dimension's number id to its string ID. 
 * 
 * @param {number} dimID the numerical id associated with the dimension.
 * @return {string} the identifier for the dimension.
 */
function dimensionIDToString(dimID) {
    switch (dimID) {
        case 0:
            return "minecraft:overworld"
        case 1:
            return "minecraft:nether"
        case 2:
            return "minecraft:the_end"
        default:
            return "null"
    }
}

function startGame() {
    system.run(() => {
        ChatManager.resetChannels();
        ChatManager.clearPlayerIdentities();
        GhostManager.clearAllInteractions();
        resetPlayerCooldowns();
        ScoreboardManager.setGameState(GameStates.RUNNING);
        ScoreboardManager.setTrackedObjective("tracking.dead_count", 0);
        ScoreboardManager.setTrackedObjective("tracking.game_length", 0);
        ScoreboardManager.setTrackedObjective("tracking.has_murderer_died", 0);
        ScoreboardManager.setTrackedObjective("tracking.has_anyone_died", 0);
        ScoreboardManager.setTrackedObjective("sound.current_song_length", -1);
        ScoreboardManager.setTrackedObjective("sound.post_song_delay", 0);
        ScoreboardManager.setTrackedObjective("sound.current_song_time", 0);
        clearPlayerScoreboards();
        clearAllNonAFKTags();
        clearDeadTags();
        stopPlayerSound();
        resetPlayerRoleHistory();
        setPlayerIDs();
        setAFKAsDead();
        LogManager.startNewLog();
        RoleAssignment.assignRoles();
        GhostManager.resetGhosts();
        PortalManager.resetPortals();
        BomberRole.clearBombs();
        if (ScoreboardManager.getTrackedObjective("settings.book_pass.enabled") > 0) {
            ScoreboardManager.setTrackedObjective("tracking.book_pass_used", 0);
        }
    });
}

function setAFKAsDead() {
    world.getAllPlayers().forEach((player) => {
        if (player.hasTag("AFK")) {
            player.addTag("dead");
            // player.setGameMode(GameMode.Adventure);
        }
    });
}

function resetPlayerCooldowns() {
    world.getAllPlayers().forEach((player) => {
        player.startItemCooldown("role_action", 0);
        player.startItemCooldown("guessing_action", 0);
    });
}

function clearPlayerScoreboards() {
    let players = world.getAllPlayers();
    players.forEach((player) => {
        player.resetLevel();
        player.getEffects().forEach((eff) => {
            player.removeEffect(eff.typeId);
        });
        ScoreboardManager.setScoreboardObjective(player, "player.guesses", 0);
        ScoreboardManager.setScoreboardObjective(player, "player.safe_guesses", 0);
        // ScoreboardManager.setScoreboardObjective(player, "player.role_id", -1);
        ScoreboardManager.setScoreboardObjective(player, "player.lover_id", -1);
        ScoreboardManager.setScoreboardObjective(player, "player.custom_role_id", -1);
        ScoreboardManager.setScoreboardObjective(player, "player.default_cooldown_multiplier", 100);
        ScoreboardManager.setScoreboardObjective(player, "player.cooldown_multiplier", 100);
        ScoreboardManager.setScoreboardObjective(player, "player.modifier_id", -1);
        ModifierAssignment.updateModifierDisplay(player);
        ScoreboardManager.setScoreboardObjective(player, "player.target_id", -1);
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", 0);
        ScoreboardManager.setScoreboardObjective(player, "sound.current_song_length", -1);
        ScoreboardManager.setScoreboardObjective(player, "sound.post_song_delay", 0);
        ScoreboardManager.setScoreboardObjective(player, "sound.current_song_time", 0);
        ScoreboardManager.setScoreboardObjective(player, "player.considered_dead_count", 0);
        ScoreboardManager.setScoreboardObjective(player, PlayerHandler.BLOCK_ALL_INTERACTION_SCOREBOARD, 0);
        ScoreboardManager.setScoreboardObjective(player, PlayerHandler.DEAL_DOUBLE_DAMAGE_USES_SCOREBOARD, 0);
        ScoreboardManager.setScoreboardObjective(player, PlayerHandler.RECEIVE_DOUBLE_DAMAGE_SCOREBOARD, 0);
        ScoreboardManager.setScoreboardObjective(player, PlayerHandler.SUPER_ARMOR_USES_SCOREBOARD, 0);

        // tempest
        ScoreboardManager.setScoreboardObjective(player, "role_settings.tempest.electricity_cooldown", 0);
        ScoreboardManager.setScoreboardObjective(player, "role_settings.tempest.teleport_cooldown", 0);
        ScoreboardManager.setScoreboardObjective(player, "role_settings.tempest.thorns_duration", 0);
        ScoreboardManager.setScoreboardObjective(player, "role_settings.tempest.tesla_duration", 0);
        PlayerHandler.updateRoleActionVisual(player);
        player.removeEffect("minecraft:wither");
        player.removeEffect("minecraft:absorption");
        player.triggerEvent("umm:set_full_health");
    });
}

function setPlayerIDs() {
    PlayerHandler._newGame();
    let players = world.getAllPlayers();
    players.forEach((player) => {
        ScoreboardManager.setScoreboardObjective(player, "player.player_id", -1);
    });

    let playingPlayers = sortPlayersWithoutTag(players, "AFK");
    let currentID = 0;
    playingPlayers.forEach((player) => {
        ScoreboardManager.setScoreboardObjective(player, "player.player_id", currentID);
        PlayerHandler.addNewPlayerToGame(player);
        currentID += 1;
    });
    PlayerHandler._savePlayersToStand();
}

world.beforeEvents.entityHurt.subscribe(async (event) => {
    
});

world.afterEvents.buttonPush.subscribe(async (event) => {
    // let playerItem = player
    if (ScoreboardManager.getTrackedObjective("reset_dispenser_button.set") != 0) {
        let dispenserButtonX = ScoreboardManager.getTrackedObjective("reset_dispenser_button.x");
        let dispenserButtonY = ScoreboardManager.getTrackedObjective("reset_dispenser_button.y");
        let dispenserButtonZ = ScoreboardManager.getTrackedObjective("reset_dispenser_button.z");
        let dispenserButtonDIM = ScoreboardManager.getTrackedObjective("reset_dispenser_button.dim");

        // world.getAllPlayers()[0].sendMessage("Checking a match for " + dispenserX + ", " + dispenserY + ", " + dispenserZ);
        if (vectorsMatch(event.block.location, dispenserButtonX, dispenserButtonY, dispenserButtonZ) && dimToID(event.dimension.id) == dispenserButtonDIM) {
            // roll for dispenser
            world.getAllPlayers().forEach((player) => {
                player.sendMessage("Resetting dispenser books, removing player books...");
                SoundManager.playSoundEffect([player], SoundEffectType.BASIC_PLING);
            })
            system.run(() => {
                clearPlayerBooks();
                clearDispenserContents();
                clearHopperContents();
                RoleAssignment._fillDispenser();
                updateDispenserCount(0);
            });
        }
        else {
            updateDispenserCount(-1);
        }
    }
    else {
        updateDispenserCount(-1);
    }

});

function updateDispenserCount(offset) {
    if (ScoreboardManager.getTrackedObjective("book_dispenser.set") == 0) {
        return;
    }

    let dispenserX = ScoreboardManager.getTrackedObjective("book_dispenser.x");
    let dispenserY = ScoreboardManager.getTrackedObjective("book_dispenser.y");
    let dispenserZ = ScoreboardManager.getTrackedObjective("book_dispenser.z");
    let dispenserDim = ScoreboardManager.getTrackedObjective("book_dispenser.dim");
    let dispenserBlock = world.getDimension(dimensionIDToString(dispenserDim)).getBlock({ x: dispenserX, y: dispenserY, z: dispenserZ });
    // world.getAllPlayers()[0].sendMessage("Finding block " + dispenserBlock.typeId + " with components ");
    // dispenserBlock.getComponents().forEach((comp) => {
    //     world.getAllPlayers()[0].sendMessage("has component " + comp.typeId);
    // });
    if (dispenserBlock != null && dispenserBlock.hasComponent("inventory")) {
        let inv = dispenserBlock.getComponent("inventory").container;
        ScoreboardManager.setTrackedObjective("book_dispenser.books", 9 - inv.emptySlotsCount + offset);
        
        if (9 - inv.emptySlotsCount + offset == 0) {
            world.sendMessage("§o§lThe book dispenser has emptied!");
        }
        // inv.clearAll();
    }
}

function clearPlayerBooks() {
    world.getAllPlayers().forEach((player) => {
        let inventory = player.getComponent("minecraft:inventory").container;
        for (let slot = 0; slot < inventory.size; slot++) {
            // playingPlayers[0].sendMessage("Checking slot " + slot);
            let itemStack = inventory.getItem(slot);
            if (itemStack != null && itemStack.typeId == "umm:role_book") {
                inventory.setItem(slot, null);
            }
        }
    });
}

function clearDispenserContents() {
    if (ScoreboardManager.getTrackedObjective("book_dispenser.set") == 0) {
        return;
    }

    let dispenserX = ScoreboardManager.getTrackedObjective("book_dispenser.x");
    let dispenserY = ScoreboardManager.getTrackedObjective("book_dispenser.y");
    let dispenserZ = ScoreboardManager.getTrackedObjective("book_dispenser.z");
    let dispenserDim = ScoreboardManager.getTrackedObjective("book_dispenser.dim");
    let dispenserBlock = world.getDimension(dimensionIDToString(dispenserDim)).getBlock({ x: dispenserX, y: dispenserY, z: dispenserZ });
    // world.getAllPlayers()[0].sendMessage("Finding block " + dispenserBlock.typeId + " with components ");
    // dispenserBlock.getComponents().forEach((comp) => {
    //     world.getAllPlayers()[0].sendMessage("has component " + comp.typeId);
    // });
    if (dispenserBlock.hasComponent("inventory")) {
        let inv = dispenserBlock.getComponent("inventory").container;
        inv.clearAll();
    }
}

function clearHopperContents() {
    if (ScoreboardManager.getTrackedObjective("book_hopper.set") == 0) {
        return;
    }

    let dispenserX = ScoreboardManager.getTrackedObjective("book_hopper.x");
    let dispenserY = ScoreboardManager.getTrackedObjective("book_hopper.y");
    let dispenserZ = ScoreboardManager.getTrackedObjective("book_hopper.z");
    let dispenserDim = ScoreboardManager.getTrackedObjective("book_hopper.dim");
    let dispenserBlock = world.getDimension(dimensionIDToString(dispenserDim)).getBlock({ x: dispenserX, y: dispenserY, z: dispenserZ });
    // world.getAllPlayers()[0].sendMessage("Finding block " + dispenserBlock.typeId + " with components ");
    // dispenserBlock.getComponents().forEach((comp) => {
    //     world.getAllPlayers()[0].sendMessage("has component " + comp.typeId);
    // });
    if (dispenserBlock.hasComponent("inventory")) {
        let inv = dispenserBlock.getComponent("inventory").container;
        inv.clearAll();
    }
}

// death handler
world.afterEvents.entityDie.subscribe(async (event) => {
    DeathHandler.checkDeath(event);
});

// When the world is loaded
world.afterEvents.worldLoad.subscribe(async (event) => {
    // world.setDifficulty(Difficulty.Hard);
    // world.getAllPlayers().forEach((pl) => pl.sendMessage("Loading world"));
    reload();
    GhostManager.initialize();
    ExtraMechanics.initialize();
    PlayerHandler.initialize();
    RoleDraft.initialize();
    PortalManager.initialize();
    SoundManager.initialize();
    PresetManager.initialize();
    ChatManager.initialize();
    RoleManager.initialize();
    ModifierManager.initialize();
    PlayerStatsHandler.initialize();
    LogManager.initialize();
    CustomRoleManager.initialize();
    ModifierManager.getModifiers();
    world.gameRules.showDeathMessages = false;
    // world.gameRules.sendCommandFeedback = false;
    // world.gameRules.commandBlockOutput = false;
    world.gameRules.doImmediateRespawn = true;
    world.gameRules.keepInventory = true;
    // world.gameRules. = true;
});

system.beforeEvents.startup.subscribe(async (init) => {
    let configBlockTypes = ["weapons_chest", "spectate_location", "player_mode_location", "start_lever", "book_dispenser", "reset_dispenser_button", "book_hopper", "respawn_position"];
    init.customCommandRegistry.registerEnum("umm:config_block_type", configBlockTypes);
    let opSetting = ["op", "deop"];
    init.customCommandRegistry.registerEnum("umm:op_setting", opSetting);
    // await RoleManager._createRoles();
    let roleNames = RoleManager.getRoles().map((r) => r.getRoleType().name);
    init.customCommandRegistry.registerEnum("umm:role_name", roleNames);
    let modifierNames = ModifierManager.getModifiers().map((r) => r.getModifierType().name);
    init.customCommandRegistry.registerEnum("umm:modifier_name", modifierNames);
    const importCommand = {
        name: "umm:import_pack",
        description: "Create a new custom sound pack.",
        permissionLevel: CommandPermissionLevel.Any,
        mandatoryParameters: [{type: CustomCommandParamType.PlayerSelector, name: "playersToRegister"}, {type: CustomCommandParamType.String, name: "packDefinition"}]
    };
    const clearPacksCommand = {
        name: "umm:clear_custom_packs",
        description: "Clears all of your custom packs",
        permissionLevel: CommandPermissionLevel.Any,
        mandatoryParameters: []
    };
    const setConfigBlock = {
        name: "umm:set_config_block",
        description: "Sets a config block for the map",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [{type: CustomCommandParamType.Enum, name:"umm:config_block_type"},{type: CustomCommandParamType.Location, name: "block_location"}]
    }
    const importRuleset = {
        name: "umm:import_ruleset",
        description: "Imports a ruleset to be used in this world.",
        permissionLevel: CommandPermissionLevel.Admin,
        mandatoryParameters: []
    };
    const setOpCommand = {
        name: "umm:set_player_op",
        description: "Set a player's permission level.",
        permissionLevel: CommandPermissionLevel.Any,
        mandatoryParameters: [{type: CustomCommandParamType.PlayerSelector, name: "playersToSet"}, {type: CustomCommandParamType.Enum, name: "umm:op_setting"}]
    };
    const setRoleCommand = {
        name: "umm:set_player_role",
        description: "Set a player's role.",
        permissionLevel: CommandPermissionLevel.Any,
        mandatoryParameters: [{type: CustomCommandParamType.PlayerSelector, name: "playersToSet"}, {type: CustomCommandParamType.Enum, name: "umm:role_name"}]

    };
    const setModifierCommand = {
        name: "umm:set_player_modifier",
        description: "Set a player's modifier.",
        permissionLevel: CommandPermissionLevel.Any,
        mandatoryParameters: [{type: CustomCommandParamType.PlayerSelector, name: "playersToSet"}, {type: CustomCommandParamType.Enum, name: "umm:modifier_name"}]
    };
    init.customCommandRegistry.registerCommand(importRuleset,
        (origin) => {
            // if (rulesetDefinition == "" || rulesetDefinition == null) {
            //     origin.sourceEntity.sendMessage("Please specify at least a ruleset name. For example, a valid input would be \"{\"ruleset_name\": \"My Ruleset\"}\"");
            //     return;
            // }
            // origin.sourceEntity.sendMessage("Registering pack to " + playersToRegister.length + " players...");
            
            system.run(() => {
                SettingsHandler._importPresetMenu(origin.sourceEntity);
            });

            // PresetManager.currentPresets.push(PresetManager.parsePresetDefinition(rulesetDefinition));

            // import pack
            // let newPack = new SoundPack(rulesetDefinition, PackTypes.CUSTOM);
            // playersToRegister.forEach((p) => {
            //     SoundManager.registerPackToPlayer(p, newPack);
            //     // p.addEffect("resistance", 10);
            //     let senderName = p.id != origin.sourceEntity.id ? origin.sourceEntity.nameTag : "You";
            //     p.sendMessage(senderName + " registered pack " + newPack.packName + " to you.");
            //     return;
            // });
        }
    );
    init.customCommandRegistry.registerCommand(importCommand,
        (origin, playersToRegister, packDefinition) => {
            // if (rulesetDefinition == "" || rulesetDefinition == null) {
            //     origin.sourceEntity.sendMessage("Please specify at least a ruleset name. For example, a valid input would be \"{\"ruleset_name\": \"My Ruleset\"}\"");
            //     return;
            // }
            // origin.sourceEntity.sendMessage("Registering pack to " + playersToRegister.length + " players...");
            
            // import pack
            let newPack = new SoundPack(packDefinition, PackTypes.CUSTOM);
            playersToRegister.forEach((p) => {
                SoundManager.registerPackToPlayer(p, newPack);
                // p.addEffect("resistance", 10);
                let senderName = p.id != origin.sourceEntity.id ? origin.sourceEntity.nameTag : "You";
                p.sendMessage(senderName + " registered pack " + newPack.packName + " to you.");
                return;
            });
        }
    );
    init.customCommandRegistry.registerCommand(clearPacksCommand,
        (origin) => {
            let sender = origin.sourceEntity;
            if (sender.typeId != "minecraft:player") {
                return;
            }
            sender.setDynamicProperty(SoundManager.soundDynamicPropertyKey, "");
            SoundManager.getSoundPacksFromPlayer(sender);
        }
    );
    init.customCommandRegistry.registerCommand(setConfigBlock,
        (origin, blockSet, location) => {
            let configType = configBlockTypes.indexOf(blockSet);
            let scoreboardId = "";
            switch (configType) {
                case 0: // weapons chest
                    scoreboardId = "weapons_chest";
                    break;
                case 1: // spectate
                    scoreboardId = "player_spectate";
                    break;
                case 2: // player
                    scoreboardId = "player_play_block";
                    break;
                case 3: // start lever
                    scoreboardId = "start_lever";
                    break;
                case 4: // book dispenser
                    scoreboardId = "book_dispenser";
                    break;
                case 5: // reset dispenser button
                    scoreboardId = "reset_dispenser_button";
                    break;
                case 6: // book hopper
                    scoreboardId = "book_hopper";
                    break;
                case 7: // respawn position
                    scoreboardId = "respawn_pos";
                    break;
                case -1:
                    origin.sourceEntity.sendMessage("Invalid block given. Please set a valid config block.");
                    return;
            }
            location.x -= .5;
            location.z -= .5;
            let locationString = "(" + location.x + ", " + location.y + ", " + location.z + ")";

            system.run(() => {
                origin.sourceEntity.sendMessage("Set the " + scoreboardId.replace("_", " ") + " location to " + locationString + ".");
                ScoreboardManager.setTrackedObjective(scoreboardId + ".set", 1);
                ScoreboardManager.setTrackedObjective(scoreboardId + ".x", location.x);
                ScoreboardManager.setTrackedObjective(scoreboardId + ".y", location.y);
                ScoreboardManager.setTrackedObjective(scoreboardId + ".z", location.z);
                ScoreboardManager.setTrackedObjective(scoreboardId + ".dim", dimToID(origin.sourceEntity.dimension.id));
            });

            if (configType == 7) {
                system.run(() => {
                    world.getAllPlayers().forEach((pl) => setPlayerRespawn(pl));
                });
            }
        }
    );
    init.customCommandRegistry.registerCommand(setOpCommand, 
        (origin, playersToSet, toOp) => {
            let source = origin.sourceEntity;
            if (source.typeId != "minecraft:player") {
                return;
            }

            if (!PlayerHandler.hasUMMOp(source)) {
                source.sendMessage("You do not have permission to op.");
                return;
            }

            if (toOp == "op") {
                playersToSet.forEach((pl) => {
                    PlayerHandler.opUMMPlayer(source, pl);
                });
            }
            else {
                playersToSet.forEach((pl) => {
                    PlayerHandler.deopUMMPlayer(source, pl);
                });
            }
        }
    );
    init.customCommandRegistry.registerCommand(setRoleCommand, 
        (origin, playersToSet, roleName) => {
            let source = origin.sourceEntity;
            if (source.typeId != "minecraft:player") {
                return;
            }
            let role = RoleManager.getRoles().filter((r) => r.getRoleType().name == roleName)[0];
            // let roleIndex = roleNames.indexOf(roleName);
            // if (roleIndex == -1) {
            //     origin.sourceEntity.sendMessage("Invalid role given. Please specific a valid role.");
            //     return;
            // }

            if (!PlayerHandler.hasUMMOp(source)) {
                source.sendMessage("You do not have permission to run this command. Ask the world owner or someone else with UMM Op to op you.");
                return;
            }

            // let role = RoleManager.getRoles()[roleIndex];

            system.run(() => {
                playersToSet.forEach((pl) => {
                    RoleAssignment.setPlayerRole(pl, role, true, false);
                });
            });
            let nameList = Util.formatStringList(playersToSet.map((pl) => pl.name), ", ", true);
            LogManager.addToLog(source.name + " changed " + nameList + "'s role to " + roleName, LogItemType.COMMAND_MESSAGE);
        }
    );
    init.customCommandRegistry.registerCommand(setModifierCommand, 
        (origin, playersToSet, modifierName) => {
            let source = origin.sourceEntity;
            if (source.typeId != "minecraft:player") {
                return;
            }
            let allModifiers = ModifierManager.getModifiers().map((r) => r.getModifierType().name);
            let modifierIndex = allModifiers.indexOf(modifierName);
            if (modifierIndex == -1) {
                origin.sourceEntity.sendMessage("Invalid modifier given. Please specific a valid modifier.");
                return;
            }

            if (!PlayerHandler.hasUMMOp(source)) {
                source.sendMessage("You do not have permission to run this command. Ask the world owner or someone else with UMM Op to op you.");
                return;
            }

            let modifier = ModifierManager.getModifiers()[modifierIndex];

            system.run(() => {
                playersToSet.forEach((pl) => {
                    ModifierAssignment.setPlayerModifier(pl, modifier);
                });
            });
            let nameList = Util.formatStringList(playersToSet.map((pl) => pl.name), ", ", true);
            LogManager.addToLog(source.name + " changed " + nameList + "'s modifier to " + modifierName, LogItemType.COMMAND_MESSAGE);
        }
    );
});

world.afterEvents.playerSpawn.subscribe(async (event) => {
    if (event.initialSpawn) {
        system.run(() => {
            setPlayerRespawn(event.player);
            if (ScoreboardManager.getScoreboardObjective(event.player, "player.has_joined") == 0) {
                ScoreboardManager.setScoreboardObjective(event.player, "player.has_joined", 1);
                ScoreboardManager.setScoreboardObjective(event.player, "player.player_id", -1);
                ScoreboardManager.setScoreboardObjective(event.player, "player.modifier_id", -1);
                ScoreboardManager.setScoreboardObjective(event.player, "player.sound.volume", 20);
                ScoreboardManager.setScoreboardObjective(event.player, "player.sound.sfx_volume", 100);
            }
            if (world.getAllPlayers().length == 1) {
                PlayerHandler.setPlayerAsWorldOwner(event.player);
                LogManager.clearLogs();
                event.player.runCommand("function helpers/setup/setup_scoreboards")
            } 
            PlayerHandler.validateWorldOwner(event.player);
            PlayerStatsHandler.onPlayerJoin(event.player);
        });
    }
    RoleDraft.initialize();
    LogManager.initialize();
    CustomRoleManager.initialize();
    ExtraMechanics.initialize();
    ChatManager.initialize();
    PlayerHandler.initialize();
    system.run(() => {
        RoleDraft.clearOfRoleDraftItems(event.player);
        setPlayerNametagState(event.player);
    });
    if (!SoundManager.initialized) {
        SoundManager.initialize();
    }
    if (!PresetManager.initialized) {    
        PresetManager.initialize();
    }
    if (!RoleDraft.isDraftRunning() && ScoreboardManager.getScoreboardObjective(event.player, "role_draft.is_running") == 1) {
        RoleDraft._unfreezePlayer(event.player);
        ScoreboardManager.setScoreboardObjective(event.player, "role_draft.is_running", 2);
    }
    // else if (RoleDraft.isDraftRunning() && ScoreboardManager.getScoreboardObjective(event.player))

});

// world.afterEvents.entitySpawn.subscribe(async (event) => {
//     let painting = event.entity;
//     if (painting.typeId == "minecraft:painting") {
        
//     }
// });

world.beforeEvents.entityRemove.subscribe(async (event) => {
    // let painting = event.removedEntity;
    // if (painting.typeId == "minecraft:painting") {
    //     system.run(() => {
    //     });
    // }
    // world.getAllPlayers().forEach((pl) => pl.sendMessage(event.removedEntity.typeId));
    // world.getAllPlayers().forEach((pl) => pl.sendMessage(event.player.typeId));
    // if (event.target.typeId == "minecraft:painting") {
    //     event.cancel = true;
    // }
});

world.beforeEvents.playerInteractWithBlock.subscribe(async (event) => {
    let player = event.player;
    let heldItem = event.itemStack;
    if (heldItem != null && heldItem.typeId == "minecraft:iron_sword") {
        let blockID = event.block.typeId;
        let bannedModifierInteractTypes = []
        if (bannedModifierInteractTypes.includes(blockID)) {
            player.setDynamicProperty("blockModifierActivationThisFrame", true);
            // player.sendMessage("Clicked an illegal block with sword");
        }
    }

    let interactScoreboard = "";
    switch (event.block.typeId) {
        case "minecraft:decorated_pot":
            interactScoreboard = "settings.map_settings.prevent_pot_interaction";
            break;
        case "minecraft:oak_shelf":
        case "minecraft:spruce_shelf":
        case "minecraft:birch_shelf":
        case "minecraft:jungle_shelf":
        case "minecraft:acacia_shelf":
        case "minecraft:dark_oak_shelf":
        case "minecraft:mangrove_shelf":
        case "minecraft:cherry_shelf":
        case "minecraft:pale_oak_shelf":
        case "minecraft:bamboo_shelf":
        case "minecraft:crimson_shelf":
        case "minecraft:warped_shelf":
        case "minecraft:poplar_shelf":
            interactScoreboard = "settings.map_settings.prevent_shelves_interaction";
            break;
        case "minecraft:candle":
        case "minecraft:white_candle":
        case "minecraft:orange_candle":
        case "minecraft:magenta_candle":
        case "minecraft:light_blue_candle":
        case "minecraft:yellow_candle":
        case "minecraft:lime_candle":
        case "minecraft:pink_candle":
        case "minecraft:gray_candle":
        case "minecraft:light_gray_candle":
        case "minecraft:cyan_candle":
        case "minecraft:purple_candle":
        case "minecraft:blue_candle":
        case "minecraft:brown_candle":
        case "minecraft:green_candle":
        case "minecraft:red_candle":
        case "minecraft:black_candle":
            interactScoreboard = "settings.map_settings.prevent_candles_interaction";
            break;
        case "minecraft:bed":
            interactScoreboard = "settings.map_settings.prevent_bed_interaction";
            break;
        case "minecraft:campfire":
            interactScoreboard = "settings.map_settings.prevent_campfires_interaction";
            break;
        case "minecraft:chiseled_bookshelf":
            interactScoreboard = "settings.map_settings.prevent_chisled_bookshelves_interaction";
            break;
        case "minecraft:flower_pot":
            interactScoreboard = "settings.map_settings.prevent_chisled_bookshelves_interaction";
            break;
        case "minecraft:dragon_egg":
            interactScoreboard = "settings.map_settings.prevent_dragon_egg_interaction";
            break;
        case "minecraft:respawn_anchors":
            interactScoreboard = "settings.map_settings.prevent_respawn_anchors_interaction";
            break;
        default:
            // event.player.sendMessage(event.block.typeId);
            return;
        }
    // event.player.sendMessage(event.block.typeId);
    
    let preventInteractVal = ScoreboardManager.getTrackedObjective(interactScoreboard);

    let allowInteraction = preventInteractVal == 0 || (preventInteractVal == 1 && event.player.getGameMode() == GameMode.Creative);
    // event.player.sendMessage("Canscellling interaction: " + !allowInteraction);
    event.cancel = !allowInteraction;
});

world.beforeEvents.playerInteractWithEntity.subscribe(async (event) => {
    if (event.target.typeId == "minecraft:armor_stand") {
        let preventArmorStand = ScoreboardManager.getTrackedObjective("settings.map_settings.prevent_armor_stand_interaction");

        let allowInteraction = preventArmorStand == 0 || (preventArmorStand == 1 && event.player.getGameMode() == GameMode.Creative);
        // event.player.sendMessage("Cancelling armor stand interaction");
        event.cancel = !allowInteraction;
    }
})

world.afterEvents.playerJoin.subscribe(async (event) => {
    // event.playerName
    // system.run(() => {
    //     setPlayerRespawn(event.)
    // })
});

// checks for book pickup
world.beforeEvents.entityItemPickup.subscribe(async (event) => {
    if (ScoreboardManager.getTrackedObjective("settings.book_pass.enabled") != 1 || !ScoreboardManager.isGameRunning()) {
        return;
    }

    let itemComp = event.item.getComponent("minecraft:item");
    if (itemComp == null) {
        return;
    }

    let item = itemComp.itemStack;
    let player = event.entity;
    let playerRole = RoleManager.getPlayerRole(player);
    if (playerRole.getAlignment() != RoleAlignment.MURDERER && player.typeId == "minecraft:player" && item.typeId == "umm:role_book") {
        let bookPassIsUsed = ScoreboardManager.getTrackedObjective("tracking.book_pass_used");
        let bookID = item.getDynamicProperty("role_id");
        let customID = item.getDynamicProperty("custom_id");
        let role = RoleManager.getMatchingRole(bookID, customID);
        if (role.getAlignment() == RoleAlignment.MURDERER && bookPassIsUsed <= 0) {
            let secondMurdererRole = getBookPassRole(role);

            player.sendMessage("You are now the second murderer!");
            system.run(() => {
                ScoreboardManager.setTrackedObjective("tracking.book_pass_used", 1);
                RoleAssignment.setPlayerRole(player, secondMurdererRole);
                DeathHandler.updateTrackers();
            });
        }
    }

});

function getBookPassRole(originalMurdererRole) {
    let bookPassCopyType = ScoreboardManager.getTrackedObjective("settings.book_pass.copy_type");
    switch (bookPassCopyType) {
        case 0:
            return new MurdererRole();
        case 1:
            let options = RoleManager.getEnabledRoles();
            options = RoleManager.sortByType(options, RoleAlignment.MURDERER);
            while (options.length > 0) {
                let randomRoleIndex = ScoreboardManager.rollRandomNumber(0, options.length);
                let randomRole = options[randomRoleIndex];
                if (randomRole.getRoleType() == originalMurdererRole.getRoleType()) {
                    options.splice(randomRoleIndex, 1);
                    continue;
                }
                return randomRole;
            }
            return new MurdererRole();
        default:
            return originalMurdererRole;
    }

}

function reload() {
    SoundManager.runQueueLoop();
    system.runInterval(() => gameLoop(), 1);
    detectPlayerAtModeChanges();
    try {
        SoundManager.getSoundSaveStand();
    }
    catch (error) {
        return;
    }
}

function gameLoop() {
    InputManager.update();
    world.getAllPlayers().forEach((pl) => {
        if (pl.isOnGround) {
            pl.removeEffect("minecraft:slow_falling");
        }
    });
}

function vectorsMatch(vector, x, y, z) {
    return vector.x == x && vector.y == y && vector.z == z;
}

/**
 * @returns {Player[]}
 */
function _getPlayingPlayers(players) {
    let livePlayers = [];
    players.forEach((player) => {
        if (ScoreboardManager.getScoreboardObjective(player, "player.player_id") >= 0) {
            livePlayers.push(player);
        }
    });
    return livePlayers;
}

/**
 * Sorts the given list of players by the given tag.
 * 
 * @param {Player[]} players the list of players to sort.
 * @param {String[]} tag the tag that players.
 * 
 * @returns {Player[]}
 */
function sortPlayersByTag(players, tag) {
    let livePlayers = [];
    players.forEach((player) => {
        if (player.hasTag(tag)) {
            livePlayers.push(player);
        }
    });
    return livePlayers;
}

/**
 * Sorts the given list of players to remove anyone with the inputted tag.
 * 
 * @param {Player[]} players the list of players to sort.
 * @param {String} tag the tag that players cannot have.
 * 
 * @returns {Player[]}
 */
function sortPlayersWithoutTag(players, tag) {
    let livePlayers = [];
    players.forEach((player) => {
        if (!player.hasTag(tag)) {
            livePlayers.push(player);
        }
    });
    return livePlayers;
}

function clearAllNonAFKTags() {
    world.getAllPlayers().forEach((player) => {
        player.getTags().forEach((tag) => {
            if (tag != "AFK") {
                player.removeTag(tag);
            }
        });
    });
}

function clearDeadTags() {
    world.getAllPlayers().forEach((player) => {
        if (player.hasTag("dead")) {
            player.removeTag("dead");
            player.setGameMode(GameMode.Adventure);
        }
    });
}

function stopPlayerSound() {
    world.getAllPlayers().forEach((player) => {
        player.stopAllSounds();
    });
}

function resetPlayerRoleHistory() {
    world.getAllPlayers().forEach((player) => {
        RoleAssignment.resetPlayerRoleHistory(player);
    });
}

/**
 * Sets the player's respawn to the set respawn position.
 * 
 * @param {Player} player the player to set the respawn of.
 */
function setPlayerRespawn(player) {
    if (ScoreboardManager.getTrackedObjective("respawn_pos.set") == 1) {
        let respawnX = ScoreboardManager.getTrackedObjective("respawn_pos.x");
        let respawnY = ScoreboardManager.getTrackedObjective("respawn_pos.y");
        let respawnZ = ScoreboardManager.getTrackedObjective("respawn_pos.z");
        let respawnDim = ScoreboardManager.getTrackedObjective("respawn_pos.dim");

        player.setSpawnPoint({ x: respawnX, y: respawnY, z: respawnZ, dimension: world.getDimension(dimensionIDToString(respawnDim)) });
        // player.sendMessage("Setting spawn...");
    }
}

/**
 * Sets whether the player's nametag is visible or not depending on if the game is running.
 * @param {Player} player 
 */
function setPlayerNametagState(player) {
    ScoreboardManager.setGameState(ScoreboardManager.getGameState());
}

//     let events = new Events(event, event.sender);
//     let v = new Version(event, event.sender);
//     let cmd = event.message.split(" ");
    // let dim = world.getDimension("overworld");
// await dim.runCommand("say hello");
    //     switch (cmd[0]) {
        //         default:
        //         case "!hello":
        //             event.sender.runCommand('say hello');
        //         case "!custom-mcfunction-cmd-version":
        //             event.cancel = true;
        //             system.run(() => {
            //                 v.version();
//             });
//             break;
//         case "!guess":
//             event.cancel = true;
//             system.run(() => {
//                 events.showAllPlayers();
//             });
//     }
// import { Events } from "./events";
// import { Version } from "./version";

// world.afterEvents.itemStartUse.subscribe((event) => {
//     let player = event.source;
//     player.sendMessage("used item");
//     let target = player.getEntitiesFromViewDirection();
//     if (target != undefined && target[0] != undefined) {
//         player.sendMessage(target[0].entity.typeId);
//     }
// });

// world.beforeEvents.itemUse.subscribe(async (event) => {
    // event.
// });