"use strict";

import { world, system, Player, ItemStack, Block, ItemLockMode, InputPermissionCategory } from "@minecraft/server";
import { ScoreboardManager } from "./scoreboard_manager";
import { RoleManager } from "./role_manager";
import { PlayerHandler } from "./player_handler";
import { Role, RoleAlignment, RoleTypes } from "./role";
import { ModifierAssignment } from "./modifier_assignment";
import { SoundManager } from "./sound_manager";
import { RoleAssignment } from "./role_assignment";

export class RoleDraft {
    static ROLES_AVAILABLE_PROPERTY = "roles_available";
    static ALIGNMENTS_AVAILABLE_PROPERTY = "alignments_left";
    static PLAYER_HOTBAR_PROPERTY = "savedHotbar";
    static DRAFT_ITEM_START = "umm:draft_option_";
    static STORED_ROLE_ID = "role_draft.current_player_id";
    static STORED_ROLE_CUSTOM_ID = "settings.role_draft.option_count";
    // a map of alignment names -> RoleType[]
    static remainingRoles = [];
    static alignments = new Map();

    static initialize() {
        let armorStand = SoundManager.getSoundSaveStand();
        if (armorStand == null) {
            if (world.getAllPlayers().length > 0) {
                world.getAllPlayers()[0].sendMessage("An error occured while reloading the role draft. Please notify a dev.");
            }
            return;
        }

        if (this.initialized) {
            return;
        }


        this.initialized = true;
        system.runInterval(this._incrementTimer, 1);
        world.beforeEvents.itemUse.subscribe((event) => {
            let player = event.source;
            let item = event.itemStack;
            let playerIsChoosing = ScoreboardManager.getPlayerID(player) == ScoreboardManager.getTrackedObjective("role_draft.current_player_id");
            if (playerIsChoosing && RoleDraft.isRoleDraftItem(item)) {
                RoleDraft.onRoleItemClick(player, item);
            }
        });

        if (world.getAllPlayers().length == 1 && RoleDraft.isDraftRunning()) {
            ScoreboardManager.setTrackedObjective("role_draft.is_running", 0);
            world.sendMessage("Role Draft was running last time, turning off.");
            return;
        }

        // if (RoleDraft.isDraftRunning()) {
        //     if (armorStand.getDynamicPropertyIds().includes(RoleDraft.ROLES_AVAILABLE_PROPERTY)) {
        //         let loadString = armorStand.getDynamicProperty(RoleDraft.ROLES_AVAILABLE_PROPERTY);
        //         if (loadString == "" || loadString == null) {
        //             return;
        //         }
        //         this.remainingRoles = JSON.parse(loadString);
        //     }
        //     if (armorStand.getDynamicPropertyIds().includes(RoleDraft.ALIGNMENTS_AVAILABLE_PROPERTY)) {
        //         let loadString = armorStand.getDynamicProperty(RoleDraft.ALIGNMENTS_AVAILABLE_PROPERTY);
        //         if (loadString == "" || loadString == null) {
        //             return;
        //         }
        //         this.alignments = JSON.parse(loadString);
        //     }
            // else {
            //     armorStand.setDynamicProperty(PresetManager.PRESET_KEY, "[]");
            // }
        // }
    }
    
    static _saveRoleDraftState() {
        let armorStand = SoundManager.getSoundSaveStand();
        if (armorStand == null) {
            if (world.getAllPlayers().length > 0) {
                world.getAllPlayers()[0].sendMessage("An error occured while saving role draft. Please notify a dev.");
            }
            return;
        }

        // let saveArray = this.remainingRoles.map((preset) => JSON.stringify(preset));
        let rolesSaveString = JSON.stringify(RoleDraft.remainingRoles);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Saving string " + rolesSaveString));
        armorStand.setDynamicProperty(RoleDraft.ROLES_AVAILABLE_PROPERTY, rolesSaveString);
        let alignmentsSaveString = JSON.stringify(RoleDraft.alignments);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Saving string " + alignmentsSaveString));
        armorStand.setDynamicProperty(RoleDraft.ALIGNMENTS_AVAILABLE_PROPERTY, alignmentsSaveString);
    }

    static startRoleDraft() {
        if (ScoreboardManager.getTrackedObjective("role_draft.is_running") == 1) {
            return;
        }

        if (ScoreboardManager.getTrackedObjective("weapons_chest.set") == 0) {
            world.sendMessage("To use Role Draft, the Weapons Chest must be set.");
            return;
        }
        let weaponsChest = RoleDraft._getWeaponsChest();
        if (weaponsChest == null) {
            return;
        }
        
        // actually start, good to go
        world.getAllPlayers().forEach((pl) => {
            pl.sendMessage("Preparing Role Draft...");
            pl.addEffect("minecraft:invisibility", 60, {showParticles: false});
            pl.addEffect("minecraft:resistance", 60, {showParticles: false, amplifier: 255});
            ScoreboardManager.setScoreboardObjective(pl, RoleDraft.STORED_ROLE_ID, -1);
            ScoreboardManager.setScoreboardObjective(pl, RoleDraft.STORED_ROLE_CUSTOM_ID, -1);
        });
        
        system.runTimeout(() => {
            ScoreboardManager.setTrackedObjective("role_draft.is_running", 1);
            RoleAssignment.clearPlayerBooks();
            
            // everyone has a player id but a role ID of 0
            let playingPlayers = PlayerHandler.getPlayingPlayers(world.getAllPlayers());
            playingPlayers.forEach((pl) => {
                ScoreboardManager.setScoreboardObjective(pl, "player.role_id", 0); 
                ScoreboardManager.setScoreboardObjective(pl, "role_draft.is_running", 1); // player role draft -> 0 not in, 1 for in, 2 for finished
                // pl.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, false);
                // RoleDraft._freezePlayer(pl);
                pl.sendMessage("Role Draft is starting! Please wait your turn for drafting.");
                // pl.sendMessage("Set id to 0");
            });
    
            this._createValidRoleData();
            this._createValidAlignmentData();
            this._saveRoleDraftState();
            this.incrementToNextPlayer();
        }, 20*3);

        // world.getAllPlayers().forEach((pl) => {
        //     pl.sendMessage("Currently have " + RoleDraft.alignments["alignments"].length + " roles to draft");
        // });
        
        // ModifierAssignment.assignModifiers();
    }

    /**
     * Makes an array of the role alignments to assign
     */
    static _createValidAlignmentData() {
        let roleCounts = RoleManager.getRoleCounts();
        this.alignments = new Map();
        this.alignments["forcedMurderers"] = Math.max(0, roleCounts.mCount - roleCounts.rmCount);
        this.alignments["forcedInnocents"] = roleCounts.iCount;
        this.alignments["alignments"] = []
        for(let i = 0; i < roleCounts.rmCount; i++) {
            this.alignments["alignments"].push(RoleAlignment.MURDERER);
        }
        for(let i = 0; i < roleCounts.rNKCount; i++) {
            this.alignments["alignments"].push(RoleAlignment.NEUTRAL_KILLER);
        }
        for(let i = 0; i < roleCounts.rNICount; i++) {
            this.alignments["alignments"].push(RoleAlignment.NEUTRAL_INDEPENDENT);
        }
        for(let i = 0; i < roleCounts.rICount; i++) {
            this.alignments["alignments"].push(RoleAlignment.INNOCENT);
        }
    }

    /**
     * Makes a json of each enabled role and how many are allowed.
     */
    static _createValidRoleData() {
        let enabledRoles = RoleManager.getEnabledRoles();
        let possibleRoles = {};
        let alignments = [RoleAlignment.INNOCENT, RoleAlignment.MURDERER, RoleAlignment.NEUTRAL_INDEPENDENT, RoleAlignment.NEUTRAL_KILLER];
        alignments.forEach((align) => {
            possibleRoles[align.description] = [];
        });

        if (enabledRoles.length <= 0) {
            // raise error
            return;
        }

        enabledRoles.forEach((role) => {
            if (role.getRoleType() == RoleTypes.MURDERER || role.getRoleType() == RoleTypes.INNOCENT) {
                return;
            }
            let roleCount = ScoreboardManager.getTrackedObjective("role_settings." + role.getRoleType().name + ".role_count");
            // let roleID = role.getRoleType().id;
            while (roleCount > 0) {
                possibleRoles[role.getAlignment().description].push(role.getRoleType());
                roleCount--;
            }
        });

        this.remainingRoles = possibleRoles;
    }

    /**
     * 
     * @returns {Player[]} Gets the list of undrafted players.
     */
    static getUndraftedPlayers() {
        return world.getAllPlayers().filter((pl) => ScoreboardManager.getScoreboardObjective(pl, "role_draft.is_running") == 1);
    }

    /**
     * Returns the block of the weapons chest. Returns null if not set.
     * @returns {Block}
     */
    static _getWeaponsChest() {
        if (ScoreboardManager.getTrackedObjective("weapons_chest.set") == 0) {
            return null;
        }
        let weaponsChestX = ScoreboardManager.getTrackedObjective("weapons_chest.x");
        let weaponsChestY = ScoreboardManager.getTrackedObjective("weapons_chest.y");
        let weaponsChestZ = ScoreboardManager.getTrackedObjective("weapons_chest.z");
        let weaponsChestDim = ScoreboardManager.getTrackedObjective("weapons_chest.dim");

        let weaponsChestBlock = world.getDimension(this.dimensionIDToString(weaponsChestDim)).getBlock({x:weaponsChestX,y:weaponsChestY,z:weaponsChestZ});
        let weaponInv = weaponsChestBlock.getComponent("minecraft:inventory");
        if (weaponInv == null || weaponInv.container == null || weaponInv.container.size < 9) {
            world.sendMessage("To use Role Draft, the Weapons Chest must have at least 9 slots.");
            // end role draft
            RoleDraft.endDraft();
            return;
        }

        return world.getDimension(this.dimensionIDToString(weaponsChestDim)).getBlock({x:weaponsChestX,y:weaponsChestY,z:weaponsChestZ});
    }

    /**
     * Converts a dimension's number id to its string ID. 
     * 
     * @param {number} dimID the numerical id associated with the dimension.
     * @return {string} the identifier for the dimension.
     */
    static dimensionIDToString(dimID) {
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

    /**
     * Starts a timer on a player and gives them role draft options.
     */
    static incrementToNextPlayer() {
        // pick a player
        let playersWithoutRole = RoleDraft.getUndraftedPlayers();
        if (playersWithoutRole.length <= 0) {
            // end draft, all players assigned
            RoleDraft.endDraft(true);
            return;
        }
        let nextPlayerIndex = ScoreboardManager.rollRandomNumber(0, playersWithoutRole.length);
        let nextPlayer = playersWithoutRole[nextPlayerIndex];

        // pick an alignment
        let alignments = RoleDraft.alignments["alignments"];
        let alignmentIndex = ScoreboardManager.rollRandomNumber(0, alignments.length);
        let nextAlignment = alignments[alignmentIndex];

        // pick 3 roles of said alignment
        let rolesTypes = [];
        let possibleRoles = this.remainingRoles[nextAlignment.description];
        // nextPlayer.sendMessage(JSON.stringify(possibleRoles));
        let possibleIndexes = possibleRoles.map((r, index) => index);
        let draftOptions = ScoreboardManager.getTrackedObjective("settings.role_draft.option_count");
        while (possibleIndexes.length > 0 && rolesTypes.length < draftOptions) {
            // roll for one index
            let nextIndex = ScoreboardManager.rollRandomNumber(0, possibleIndexes.length);
            let newRoleIndex = possibleIndexes[nextIndex];
            rolesTypes.push(possibleRoles[newRoleIndex]);
            possibleIndexes.splice(nextIndex, 1);
        }
        
        // if there aren't enough innocent or murderer roles
        let includeBaseRoles = ScoreboardManager.getTrackedObjective("settings.role_draft.include_base_roles") != 0;
        if ((includeBaseRoles && rolesTypes.length < 3) || rolesTypes.length == 0) {
            if (nextAlignment == RoleAlignment.INNOCENT) {
                rolesTypes.push(RoleTypes.INNOCENT);
            }
            if (nextAlignment == RoleAlignment.MURDERER && rolesTypes.length < 3) {
                rolesTypes.push(RoleTypes.MURDERER);
            }
        }

        // save player's hotbar
        RoleDraft.savePlayerHotbar(nextPlayer);
        nextPlayer.playSound("note.pling", {pitch:1.5, volume: 2});
        nextPlayer.sendMessage("§oIt's your turn to draft! You're going to be a " + nextAlignment.display_name + "! Pick one of these roles!");
        nextPlayer.onScreenDisplay.setTitle(nextAlignment.display_name, {subtitle: "Pick one of these 3 options.", stayDuration: 3*20, fadeInDuration: 5, fadeOutDuration: 10});

        // create and place items
        let playerInv = nextPlayer.getComponent("minecraft:inventory").container;
        rolesTypes.forEach((roleType) => {
            // nextPlayer.sendMessage("Making role of index " + JSON.stringify(roleIndex));
            // let matchingRole = RoleManager.getMatchingRole(roleType.id, Object.hasOwn(roleType, "custom_id" ? roleType.custom_id : null));
            let roleItem = RoleDraft.createRoleDraftItem(roleType);
            playerInv.addItem(roleItem);
        });

        // start a timer
        let playerID = ScoreboardManager.getPlayerID(nextPlayer);
        ScoreboardManager.setTrackedObjective("role_draft.current_player_id", playerID);
        RoleDraft.resetDraftTimer();
    }

    static isDraftRunning() {
        return ScoreboardManager.getTrackedObjective("role_draft.is_running") == 1;
    }

    /**
     * Saves a player's hotbar to data
     * @param {Player} player 
     */
    static savePlayerHotbar(player) {
        let inventoryComp = player.getComponent("minecraft:inventory");
        let playerInv = inventoryComp.container;
        let weaponsChest = this._getWeaponsChest();
        if (weaponsChest == null) {
            return;
        }
        let weaponsInventoryComp = weaponsChest.getComponent("minecraft:inventory");
        let weaponsInv = weaponsInventoryComp.container;

        for (let i = 0; i < 9; i++) {
            let nextItem = playerInv.getItem(i);
            weaponsInv.setItem(i, nextItem);
            playerInv.setItem(i);
        }
        // player.sendMessage("Cleared hotbar and placed in weapons chest");
    }

    /**
     * Loads a player's hotbar from data. If data is null, does nothing.
     * @param {Player} player 
     */
    static loadPlayerHotbar(player) {
        let inventoryComp = player.getComponent("minecraft:inventory");
        let inv = inventoryComp.container;
        let weaponsChest = this._getWeaponsChest();
        if (weaponsChest == null) {
            return;
        }
        let weaponsInventoryComp = weaponsChest.getComponent("minecraft:inventory");
        let weaponsInv = weaponsInventoryComp.container;

        for (let i = 0; i < 9; i++) {
            let nextItem = weaponsInv.getItem(i);
            // player.sendMessage("" + nextItem.typeId);
            inv.setItem(i, nextItem);
        }
    }

    /**
     * 
     * @param {RoleTypes} roleType 
     * @returns 
     */
    static createRoleDraftItem(roleType) {
        let roleGuessItem = new ItemStack(RoleDraft.DRAFT_ITEM_START + roleType.name, 1);
        roleGuessItem.lockMode = ItemLockMode.inventory;
        // roleGuessItem.
        return roleGuessItem;
    }

    static resetDraftTimer() {
        let chooseTime = ScoreboardManager.getTrackedObjective("settings.role_draft.time_to_choose");
        ScoreboardManager.setTrackedObjective("role_draft.current_timer", chooseTime * 20);
    }

    static _incrementTimer() {
        if (!RoleDraft.isDraftRunning()) {
            return;
        }

        let currentTime = ScoreboardManager.getTrackedObjective("role_draft.current_timer");
        let currentPlayer = RoleDraft.getCurrentDraftingPlayer();

        if (currentPlayer == null) {
            world.sendMessage("The drafting player disconnected! Onto the next person!");
            RoleDraft.incrementToNextPlayer();
            return;
        }

        if (currentTime == 1) {
            // force a choice
            currentPlayer.sendMessage("Time up!");
            ScoreboardManager.addScoreboardObjective("game_data", "role_draft.current_timer", -1);
            RoleDraft.onTimerExpire();
            return;
            // RoleDraft.loadPlayerHotbar(currentPlayer);
            // ScoreboardManager.setTrackedObjective("role_draft.is_running", 0);
        }
        if (currentTime == 0) {
            return;
        }

        // increment timer
        ScoreboardManager.addScoreboardObjective("game_data", "role_draft.current_timer", -1);

        // title and update xp bar
        let totalTime = ScoreboardManager.getTrackedObjective("settings.role_draft.time_to_choose") * 20;
        let timeLeft = totalTime - currentTime;
        let playerXP = currentPlayer.totalXpNeededForNextLevel;
        let expectedXP = playerXP - ((timeLeft / totalTime) * playerXP);
        let currentXP = currentPlayer.xpEarnedAtCurrentLevel;
        // currentPlayer.sendMessage("Expected XP " + expectedXP + ". Current XP " + currentXP);
        if (expectedXP != currentXP) {
            currentPlayer.addExperience(expectedXP - currentXP);
        }
    }

    /**
     * Gets the current drafting player.
     * @returns {Player}
     */
    static getCurrentDraftingPlayer() {
        let currentPlayerId = ScoreboardManager.getTrackedObjective("role_draft.current_player_id");
        return ScoreboardManager.getPlayerWithID(currentPlayerId);
    }

    static onTimerExpire() {
        let currentPlayer = RoleDraft.getCurrentDraftingPlayer();
        let inv = currentPlayer.getComponent("minecraft:inventory").container;
        let draftItem = null;
        let currentInvSlot = 0;
        // that's right
        // this whole time, the role draft doesn't pick a random item
        // it's actually the first
        // people believe whatever lies you feed them
        while (!RoleDraft.isRoleDraftItem(draftItem) && currentInvSlot < inv.size) {
            draftItem = inv.getItem(currentInvSlot);
            currentInvSlot++;
        }
        if (draftItem == null) {
            world.sendMessage("There was an error in the role draft! The current player (" + currentPlayer.name + ") had no options!");
            RoleDraft.endDraft();
            return;
        }
        let chosenRoleID = draftItem.typeId.substring(RoleDraft.DRAFT_ITEM_START.length);
        let chosenRole = RoleDraft.getRoleFromName(chosenRoleID);
        currentPlayer.sendMessage("Automatically selected " + chosenRole.getDisplayName());
        RoleDraft.completeCurrentPlayersDraft(chosenRole);
    }

    /**
     * Ends the role draft.
     * @param {boolean} successfulEnd Whether the role draft was successful, which will assign modifiers and send messages.
     * @returns 
     */
    static endDraft(successfulEnd) {
        if (!RoleDraft.isDraftRunning()) {
            return;
        }
        ScoreboardManager.setTrackedObjective("role_draft.is_running", 2);
        world.getAllPlayers().forEach((pl) => {
            RoleDraft._unfreezePlayer(pl);
            pl.addEffect("minecraft:invisibility", 5*20, {showParticles:false});
            pl.addEffect("minecraft:resistance", 5*20, {amplifier:255,showParticles:false});
        });
        if (successfulEnd) {
            world.getAllPlayers().forEach((pl) => {
                pl.sendMessage("Drafting is finished! The game has begun!");
                let roleID = ScoreboardManager.getScoreboardObjective(pl, RoleDraft.STORED_ROLE_ID);
                let customID = ScoreboardManager.getScoreboardObjective(pl, RoleDraft.STORED_ROLE_CUSTOM_ID);
                RoleAssignment.setPlayerRole(pl, RoleManager.getMatchingRole(roleID, customID));
            });
            RoleAssignment.afterRolesAssigned.emit();
            ModifierAssignment.assignModifiers();
        }
    }

    /**
     * Checks if the given item is a role draft item
     * @param {ItemStack} item the item to check
     * @returns {boolean} if the item is a draft item
     */
    static isRoleDraftItem(item) {
        return item != null && item.typeId.startsWith(RoleDraft.DRAFT_ITEM_START);
    }

    /**
     * 
     * @param {Player} player 
     * @param {ItemStack} itemClicked 
     */
    static onRoleItemClick(player, itemClicked) {
        let currentPlayer = RoleDraft.getCurrentDraftingPlayer();
        if (player.id != currentPlayer.id || !RoleDraft.isDraftRunning()) {
            // this.endDraft();
            return;
        }
        let chosenRoleID = itemClicked.typeId.substring(RoleDraft.DRAFT_ITEM_START.length);
        let chosenRole = RoleDraft.getRoleFromName(chosenRoleID);
        // player.sendMessage("Selected " + chosenRole.getDisplayName());
        RoleDraft.completeCurrentPlayersDraft(chosenRole);
    }

    /**
     * 
     * @param {Role} roleToChoose 
     */
    static completeCurrentPlayersDraft(roleToChoose) {
        let currentPlayer = RoleDraft.getCurrentDraftingPlayer();
        
        let alignmentChosen = roleToChoose.getAlignment();
        let roleTypeChosen = roleToChoose.getRoleType();
        
        // remove the player's alignment, if found. Allows for people to use their own draft icon
        let allAlignments = this.alignments["alignments"];
        let alignmentIndex = allAlignments.findIndex((align) => align == alignmentChosen);
        if (alignmentIndex > -1) {
            // currentPlayer.sendMessage("" + this.alignments["alignments"].length);
            allAlignments.splice(alignmentIndex, 1);
            // currentPlayer.sendMessage("" + this.alignments["alignments"].length);
        }

        // remove the player's role, if found. Allows for people to use their own draft icon
        let duplicatesEnabled = ScoreboardManager.getTrackedObjective("settings.role_draft.can_have_duplicates") != 0;
        if (!duplicatesEnabled) {
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Duplicates off, removing " + roleTypeChosen.name));
            let allRolesOfAlignment = this.remainingRoles[alignmentChosen.description];
            let roleIndex = allRolesOfAlignment.findIndex((role) => role.id == roleTypeChosen.id);
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Index found " + roleIndex));
            if (roleIndex > -1) {
                // currentPlayer.sendMessage("" + this.remainingRoles[alignmentChosen.description].length);
                allRolesOfAlignment.splice(roleIndex, 1);
                // currentPlayer.sendMessage("" + this.remainingRoles[alignmentChosen.description].length);
            }
        }

        
        this._saveRoleDraftState();
        system.run(() => {
            ScoreboardManager.setTrackedObjective("role_draft.current_timer", 500);
            currentPlayer.resetLevel();
            RoleDraft.clearOfRoleDraftItems(currentPlayer);
            ScoreboardManager.setScoreboardObjective(currentPlayer, "role_draft.is_running", 2);
            RoleDraft.loadPlayerHotbar(currentPlayer);
            ScoreboardManager.setScoreboardObjective(currentPlayer, RoleDraft.STORED_ROLE_ID, roleToChoose.getRoleType().id);
            if (Object.hasOwn(roleToChoose.getRoleType(), "custom_id")) {
                ScoreboardManager.setScoreboardObjective(currentPlayer, RoleDraft.STORED_ROLE_CUSTOM_ID, roleToChoose.getRoleType().custom_id);
            }
            // RoleAssignment.setPlayerRole(currentPlayer, roleToChoose, true);
            currentPlayer.sendMessage("§oYour role will be " + roleToChoose.getDisplayName() + "§r§o when the game starts!");
            
            let book = RoleAssignment._createBookForRole(roleToChoose);
            currentPlayer.addItem(book);

            let playersRemaining = RoleDraft.getUndraftedPlayers().length;
            if (playersRemaining != 0) {
                world.sendMessage(playersRemaining + " players left to draft!");
            }

            RoleDraft.incrementToNextPlayer();
        });
    }
    
    /**
     * 
     * @param {Player} player 
     */
    static clearOfRoleDraftItems(player) {
        if (RoleDraft.isDraftRunning()) {
            return;
        }
        let inv = player.getComponent("minecraft:inventory").container;
        for (let i = 0; i < inv.size; i++) {
            let nextItem = inv.getItem(i);
            if (RoleDraft.isRoleDraftItem(nextItem)) {
                inv.setItem(i);
            }
        } 
    }

    /**
     * 
     * @param {Player} player 
     */
    static _freezePlayer(player) {
        player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
        player.addEffect("minecraft:blindness", 20000000);
        player.addEffect("minecraft:invisibility", 20000000);
        player.addEffect("minecraft:resistance", 20000000, {amplifier:255});
    }

    static _unfreezePlayer(player) {
        player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
        player.removeEffect("minecraft:blindness");
        player.removeEffect("minecraft:invisibility");
        player.removeEffect("minecraft:resistance");
        RoleDraft.clearOfRoleDraftItems(player);
    } 

    /**
     * 
     * @param {string} roleName 
     */
    static getRoleFromName(roleName) {
        let allRoles = RoleManager.getRoles();
        for (let i = 0; i < allRoles.length; i++) {
            let nextRole = allRoles[i];
            if (nextRole.getRoleType().name.toLowerCase() == roleName.toLowerCase()) {
                return nextRole;
            }
        }
        return null;
    }
}